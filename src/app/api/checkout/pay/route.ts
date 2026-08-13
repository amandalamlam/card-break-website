import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { requireSessionUser } from "@/lib/security/require-session-user";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getBreakById, getSlotById } from "@/lib/breaks/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, getStripeSessionExpiresAtUnix, toStripeAmount } from "@/lib/stripe/server";
import {
  buildCheckoutCancelUrl,
  buildCheckoutSuccessUrl,
  buildCheckoutSuccessUrlCreditOnly,
} from "@/lib/stripe/checkout-urls";
import { validateBuyNowLock } from "@/lib/stripe/orders-core";
import { clampCreditAmount, roundMoney } from "@/lib/wallet/types";
import { createCheckoutOrder, fulfillCreditOnlyOrder } from "@/lib/wallet/credit";
import type { AppLocale } from "@/i18n/routing";

type CheckoutPayBody = {
  breakId?: string;
  slotId?: string;
  locale?: AppLocale;
  creditAmount?: number;
};

export async function POST(request: Request) {
  try {
    const authSession = await requireSessionUser();
    if (!authSession.ok) {
      return authSession.response;
    }

    const rateLimited = enforceRateLimit(
      request,
      "checkout-pay",
      authSession.userId,
      RATE_LIMITS.checkoutPerUserMinute
    );
    if (rateLimited) {
      return rateLimited;
    }

    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await request.json()) as CheckoutPayBody;
    const { breakId, slotId, locale = "zh-Hant", creditAmount = 0 } = body;

    if (!breakId || !slotId) {
      return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
    }

    const hasValidLock = await validateBuyNowLock(slotId, authSession.userId);
    if (!hasValidLock) {
      return NextResponse.json({ error: "LOCK_EXPIRED" }, { status: 409 });
    }

    const breakItem = await getBreakById(breakId);
    const slot = await getSlotById(slotId, breakId);

    if (!breakItem || !slot || breakItem.status !== "active" || slot.status !== "locked") {
      return NextResponse.json({ error: "SLOT_UNAVAILABLE" }, { status: 409 });
    }

    const slotPrice = Number(slot.price);
    const appliedCredit = roundMoney(
      clampCreditAmount(Number(creditAmount), slotPrice, Number(profile.store_credit))
    );
    const stripeAmount = roundMoney(slotPrice - appliedCredit);

    const orderResult = await createCheckoutOrder(authSession.userId, breakId, slotId, appliedCredit);
    if (!orderResult.ok) {
      return NextResponse.json({ error: orderResult.code }, { status: 409 });
    }

    const orderId = orderResult.orderId;

    if (stripeAmount <= 0) {
      await fulfillCreditOnlyOrder(orderId);
      return NextResponse.json({
        type: "credit",
        orderId,
        successUrl: buildCheckoutSuccessUrlCreditOnly(locale, orderId),
      });
    }

    const stripe = getStripe();
    const admin = createAdminClient();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      expires_at: getStripeSessionExpiresAtUnix(),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "hkd",
            unit_amount: toStripeAmount(stripeAmount),
            product_data: {
              name: `${breakItem.title} — ${slot.name}`,
              description:
                appliedCredit > 0
                  ? `Buy Now (store credit applied: HK$${appliedCredit.toFixed(2)})`
                  : `Buy Now: ${slot.name}`,
            },
          },
        },
      ],
      success_url: buildCheckoutSuccessUrl(locale, orderId),
      cancel_url: buildCheckoutCancelUrl(locale, orderId, "buy_now"),
      client_reference_id: orderId,
      metadata: {
        order_id: orderId,
        break_id: breakId,
        slot_id: slotId,
        user_id: authSession.userId,
        credit_amount: String(appliedCredit),
        checkout_mode: "buy_now",
      },
    });

    await admin
      .from("orders")
      .update({ stripe_checkout_session_id: checkoutSession.id })
      .eq("id", orderId)
      .eq("user_id", authSession.userId);

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "STRIPE_SESSION_FAILED" }, { status: 500 });
    }

    return NextResponse.json({
      type: "stripe",
      orderId,
      url: checkoutSession.url,
      creditAmount: appliedCredit,
      stripeAmount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
