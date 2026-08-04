import { createAdminClient } from "@/lib/supabase/admin";
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

export async function validateUserLock(slotId: string, userId: string): Promise<boolean> {
  await releaseExpiredSlotLocks();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("break_slots")
    .select("id, status, user_id, locked_at")
    .eq("id", slotId)
    .single();

  if (error || !data) {
    return false;
  }

  return (
    data.status === "locked" &&
    Boolean(data.locked_at) &&
    uuidEquals(data.user_id, userId)
  );
}
