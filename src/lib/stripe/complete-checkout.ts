import { getOrderByCheckoutSessionId, getOrderById } from "@/lib/orders/queries";
import { fulfillSlotPurchase } from "@/lib/stripe/orders-core";
import { getStripe } from "@/lib/stripe/server";
import type { OrderWithItems } from "@/lib/orders/queries";

export type CompleteCheckoutResult =
  | { ok: true; order: OrderWithItems }
  | { ok: false; reason: "MISSING_PARAMS" | "SESSION_INCOMPLETE" | "ORDER_NOT_FOUND" | "NOT_PAID" };

export async function completeCheckoutFromStripeSession(
  sessionId: string,
  orderIdHint?: string | null
): Promise<CompleteCheckoutResult> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.status !== "complete") {
    return { ok: false, reason: "SESSION_INCOMPLETE" };
  }

  const orderId =
    session.metadata?.order_id ??
    (typeof session.client_reference_id === "string" ? session.client_reference_id : null) ??
    orderIdHint ??
    null;

  if (!orderId) {
    const orderBySession = await getOrderByCheckoutSessionId(sessionId);
    if (!orderBySession) {
      return { ok: false, reason: "ORDER_NOT_FOUND" };
    }

    if (orderBySession.status !== "paid") {
      return { ok: false, reason: "NOT_PAID" };
    }

    return { ok: true, order: orderBySession };
  }

  if (session.payment_status === "paid" || session.status === "complete") {
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    try {
      await fulfillSlotPurchase(orderId, paymentIntentId);
    } catch {
      const existing = await getOrderById(orderId);
      if (!existing || existing.status !== "paid") {
        return { ok: false, reason: "NOT_PAID" };
      }
    }
  }

  const order = await getOrderById(orderId);

  if (!order) {
    return { ok: false, reason: "ORDER_NOT_FOUND" };
  }

  if (order.status !== "paid") {
    return { ok: false, reason: "NOT_PAID" };
  }

  return { ok: true, order };
}

export async function resolvePaidOrderForSuccessPage(
  sessionId?: string | null,
  orderId?: string | null
): Promise<CompleteCheckoutResult> {
  if (!sessionId && !orderId) {
    return { ok: false, reason: "MISSING_PARAMS" };
  }

  if (sessionId) {
    return completeCheckoutFromStripeSession(sessionId, orderId);
  }

  const order = await getOrderById(orderId!);

  if (!order) {
    return { ok: false, reason: "ORDER_NOT_FOUND" };
  }

  if (order.status !== "paid") {
    return { ok: false, reason: "NOT_PAID" };
  }

  return { ok: true, order };
}
