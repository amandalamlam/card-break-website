import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getBreakById, getSlotById } from "@/lib/breaks/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, toStripeAmount } from "@/lib/stripe/server";
import {
  buildCheckoutCancelUrl,
  buildCheckoutSuccessUrl,
  buildCheckoutSuccessUrlCreditOnly,
} from "@/lib/stripe/checkout-urls";
import { validateUserLock } from "@/lib/stripe/orders";
import { clampCreditAmount, roundMoney } from "@/lib/wallet/types";
import { createCheckoutOrder, fulfillCreditOnlyOrder } from "@/lib/wallet/credit";
import { getCurrentProfile } from "@/lib/auth/session";
import type { AppLocale } from "@/i18n/routing";

type CheckoutPayBody = {
  breakId?: string;
  slotId?: string;
  locale?: AppLocale;
  creditAmount?: number;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
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

    const hasValidLock = await validateUserLock(slotId, user.id);
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

    const orderResult = await createCheckoutOrder(user.id, breakId, slotId, appliedCredit);

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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
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
                  ? `Card break slot (store credit applied: HK$${appliedCredit.toFixed(2)})`
                  : `Card break slot: ${slot.name}`,
            },
          },
        },
      ],
      success_url: buildCheckoutSuccessUrl(locale, orderId),
      cancel_url: buildCheckoutCancelUrl(locale, breakId, slotId),
      client_reference_id: orderId,
      metadata: {
        order_id: orderId,
        break_id: breakId,
        slot_id: slotId,
        user_id: user.id,
        credit_amount: String(appliedCredit),
      },
    });

    await admin
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderId);

    if (!session.url) {
      return NextResponse.json({ error: "STRIPE_SESSION_FAILED" }, { status: 500 });
    }

    return NextResponse.json({
      type: "stripe",
      orderId,
      url: session.url,
      creditAmount: appliedCredit,
      stripeAmount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
