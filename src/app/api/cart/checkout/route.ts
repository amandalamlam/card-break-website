import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { requireSessionUser } from "@/lib/security/require-session-user";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getActiveCart, createCartCheckoutOrder } from "@/lib/cart/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCartStripeLineItems } from "@/lib/stripe/cart-line-items";
import { getStripe, getStripeSessionExpiresAtUnix } from "@/lib/stripe/server";
import {
  buildCartCheckoutCancelUrl,
  buildCheckoutSuccessUrl,
  buildCheckoutSuccessUrlCreditOnly,
} from "@/lib/stripe/checkout-urls";
import { buildCheckoutMetadata } from "@/lib/stripe/checkout-metadata";
import { fulfillCreditOnlyOrder } from "@/lib/wallet/credit";
import { clampCreditAmount, parseWalletBalance, roundMoney } from "@/lib/wallet/types";
import type { AppLocale } from "@/i18n/routing";

type CartCheckoutBody = {
  locale?: AppLocale;
  /** @deprecated Use appliedCredit */
  creditAmount?: number;
  appliedCredit?: number;
};

export async function POST(request: Request) {
  try {
    const authSession = await requireSessionUser();
    if (!authSession.ok) {
      return authSession.response;
    }

    const rateLimited = enforceRateLimit(
      request,
      "cart-checkout",
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

    const body = (await request.json()) as CartCheckoutBody;
    const { locale = "zh-Hant" } = body;
    const requestedCredit = body.appliedCredit ?? body.creditAmount ?? 0;

    const cart = await getActiveCart(authSession.userId);
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "CART_EMPTY" }, { status: 409 });
    }

    if (cart.remainingSeconds <= 0) {
      return NextResponse.json({ error: "CART_EXPIRED" }, { status: 409 });
    }

    const wallet = parseWalletBalance(profile);
    const total = roundMoney(cart.totalAmount);
    const appliedCredit = roundMoney(
      clampCreditAmount(Number(requestedCredit), total, wallet.availableCredit)
    );
    const stripeAmount = roundMoney(Math.max(0, total - appliedCredit));

    const orderResult = await createCartCheckoutOrder(authSession.userId, appliedCredit);
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
        creditAmount: appliedCredit,
        stripeAmount: 0,
      });
    }

    const stripe = getStripe();
    const admin = createAdminClient();

    const lineItems = buildCartStripeLineItems(
      cart.items,
      total,
      stripeAmount,
      appliedCredit
    );

    const checkoutMetadata = buildCheckoutMetadata({
      orderId,
      userId: authSession.userId,
      creditAmount: appliedCredit,
      stripeAmount,
      checkoutMode: "cart",
      cartId: cart.id,
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      expires_at: getStripeSessionExpiresAtUnix(),
      line_items: lineItems,
      success_url: buildCheckoutSuccessUrl(locale, orderId),
      cancel_url: buildCartCheckoutCancelUrl(locale, orderId),
      client_reference_id: orderId,
      metadata: checkoutMetadata,
      payment_intent_data: {
        metadata: checkoutMetadata,
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
