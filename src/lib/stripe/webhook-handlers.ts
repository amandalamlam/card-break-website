import type Stripe from "stripe";
import { getOrderById } from "@/lib/orders/queries";
import { handleCheckoutCancellation } from "@/lib/stripe/checkout-cancel";
import { fulfillSlotPurchase } from "@/lib/stripe/orders";

function resolveOrderId(
  primary?: string | null,
  fallback?: string | null
): string | null {
  const orderId = primary ?? fallback ?? null;
  return orderId && orderId.length > 0 ? orderId : null;
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.payment_status !== "paid") {
    return;
  }

  const orderId = resolveOrderId(session.metadata?.order_id, session.client_reference_id);
  if (!orderId) {
    console.warn("[stripe webhook] checkout.session.completed missing order_id", session.id);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  try {
    await fulfillSlotPurchase(orderId, paymentIntentId);
  } catch (error) {
    const existing = await getOrderById(orderId).catch(() => null);
    if (existing?.status === "paid") {
      return;
    }

    console.error("[stripe webhook] fulfill failed", {
      orderId,
      sessionId: session.id,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

export async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session
): Promise<void> {
  const orderId = resolveOrderId(session.metadata?.order_id, session.client_reference_id);
  if (!orderId) {
    return;
  }

  await handleCheckoutCancellation(orderId, session.metadata?.user_id ?? null);
}

export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const orderId = paymentIntent.metadata?.order_id;
  if (!orderId) {
    return;
  }

  await handleCheckoutCancellation(orderId, paymentIntent.metadata?.user_id ?? null);
}

export async function processStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "checkout.session.expired":
      await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    default:
      break;
  }
}
