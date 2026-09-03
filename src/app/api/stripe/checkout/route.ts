import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/security/require-session-user";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getBreakById, getSlotById } from "@/lib/breaks/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, toStripeAmount } from "@/lib/stripe/server";
import {
  buildCheckoutSuccessUrl,
  buildLegacyCheckoutCancelUrl,
} from "@/lib/stripe/checkout-urls";
import { buildCheckoutMetadata } from "@/lib/stripe/checkout-metadata";
import { validateUserLock } from "@/lib/stripe/orders";
import type { AppLocale } from "@/i18n/routing";

type CheckoutBody = {
  breakId?: string;
  slotId?: string;
  locale?: AppLocale;
};

export async function POST(request: Request) {
  try {
    const authSession = await requireSessionUser();
    if (!authSession.ok) {
      return authSession.response;
    }

    const rateLimited = enforceRateLimit(
      request,
      "stripe-checkout",
      authSession.userId,
      RATE_LIMITS.checkoutPerUserMinute
    );
    if (rateLimited) {
      return rateLimited;
    }

    const body = (await request.json()) as CheckoutBody;
    const { breakId, slotId, locale = "zh-Hant" } = body;

    if (!breakId || !slotId) {
      return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
    }

    const hasValidLock = await validateUserLock(slotId, authSession.userId);
    if (!hasValidLock) {
      return NextResponse.json({ error: "LOCK_EXPIRED" }, { status: 409 });
    }

    const breakItem = await getBreakById(breakId);
    const slot = await getSlotById(slotId, breakId);

    if (!breakItem || !slot || breakItem.status !== "active" || slot.status !== "locked") {
      return NextResponse.json({ error: "SLOT_UNAVAILABLE" }, { status: 409 });
    }

    const admin = createAdminClient();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: authSession.userId,
        break_id: breakId,
        slot_id: slotId,
        amount: slot.price,
        currency: "hkd",
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message ?? "ORDER_CREATE_FAILED" }, { status: 500 });
    }

    const stripe = getStripe();

    const checkoutMetadata = buildCheckoutMetadata({
      orderId: order.id,
      userId: authSession.userId,
      breakId,
      slotId,
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "hkd",
            unit_amount: toStripeAmount(Number(slot.price)),
            product_data: {
              name: `${breakItem.title} — ${slot.name}`,
              description: `Card break slot: ${slot.name}`,
            },
          },
        },
      ],
      success_url: buildCheckoutSuccessUrl(locale, order.id),
      cancel_url: buildLegacyCheckoutCancelUrl(locale, breakId, slotId),
      client_reference_id: order.id,
      metadata: checkoutMetadata,
      payment_intent_data: {
        metadata: checkoutMetadata,
      },
    });

    await admin
      .from("orders")
      .update({ stripe_checkout_session_id: checkoutSession.id })
      .eq("id", order.id)
      .eq("user_id", authSession.userId);

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "STRIPE_SESSION_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
