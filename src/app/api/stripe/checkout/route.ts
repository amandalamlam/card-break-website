import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getBreakById, getSlotById } from "@/lib/breaks/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl, getStripe, toStripeAmount } from "@/lib/stripe/server";
import { validateUserLock } from "@/lib/stripe/orders";
import type { AppLocale } from "@/i18n/routing";

type CheckoutBody = {
  breakId?: string;
  slotId?: string;
  locale?: AppLocale;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await request.json()) as CheckoutBody;
    const { breakId, slotId, locale = "zh-Hant" } = body;

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

    const admin = createAdminClient();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
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

    const appUrl = getAppUrl();
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
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
      success_url: `${appUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/${locale}/checkout/start?breakId=${breakId}&slotId=${slotId}`,
      client_reference_id: order.id,
      metadata: {
        order_id: order.id,
        break_id: breakId,
        slot_id: slotId,
        user_id: user.id,
      },
    });

    await admin
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id);

    if (!session.url) {
      return NextResponse.json({ error: "STRIPE_SESSION_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
