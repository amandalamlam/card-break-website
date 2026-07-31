import { createAdminClient } from "@/lib/supabase/admin";

export async function fulfillSlotPurchase(
  orderId: string,
  paymentIntentId?: string | null
): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("fulfill_slot_purchase", {
    p_order_id: orderId,
    p_payment_intent_id: paymentIntentId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function cancelPendingOrder(orderId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("cancel_pending_order", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function getOrderByCheckoutSessionId(sessionId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("orders")
    .select("id, user_id, break_id, slot_id, amount, currency, status")
    .eq("stripe_checkout_session_id", sessionId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function validateUserLock(slotId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("break_slots")
    .select("id, status, user_id, locked_at")
    .eq("id", slotId)
    .single();

  if (error || !data) {
    return false;
  }

  if (data.status !== "locked" || data.user_id !== userId) {
    return false;
  }

  if (!data.locked_at) {
    return false;
  }

  const expiresAt = new Date(data.locked_at).getTime() + 8 * 60 * 1000;
  return expiresAt > Date.now();
}
