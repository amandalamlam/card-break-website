import { createAdminClient } from "@/lib/supabase/admin";
import { isSlotLockActive } from "@/lib/slots/helpers";
import { uuidEquals } from "@/lib/slots/time";
import { releaseExpiredSlotLocks } from "@/lib/slots/locking";

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

  const fulfilled = Boolean(data);
  if (fulfilled) {
    await expireCartAfterOrderPaid(orderId);
  }

  return fulfilled;
}

async function expireCartAfterOrderPaid(orderId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("cart_id, checkout_mode")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.cart_id || order.checkout_mode !== "cart") {
    return;
  }

  await admin.from("cart_items").delete().eq("cart_id", order.cart_id);
  await admin
    .from("carts")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("id", order.cart_id);
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

export async function validateBuyNowLock(slotId: string, userId: string): Promise<boolean> {
  await releaseExpiredSlotLocks();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("break_slots")
    .select("id, status, user_id, locked_at, lock_type, lock_expires_at")
    .eq("id", slotId)
    .single();

  if (error || !data) {
    return false;
  }

  return (
    data.status === "locked" &&
    data.lock_type === "buy_now" &&
    uuidEquals(data.user_id, userId) &&
    isSlotLockActive(data)
  );
}

/** @deprecated Use validateBuyNowLock */
export const validateUserLock = validateBuyNowLock;
