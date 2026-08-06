import { createAdminClient } from "@/lib/supabase/admin";
import { handleCartCheckoutReturn } from "@/lib/cart/checkout-cancel";
import { cancelPendingOrder } from "./orders-core";

export type BuyNowCancelContext = {
  breakId: string | null;
};

export async function handleBuyNowCheckoutCancel(orderId: string): Promise<BuyNowCancelContext> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, break_id, checkout_mode, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.checkout_mode !== "buy_now") {
    return { breakId: order?.break_id ?? null };
  }

  if (order.status === "pending") {
    try {
      await cancelPendingOrder(orderId);
    } catch {
      /* Order may already be cancelled or credit already released */
    }
  }

  return { breakId: order.break_id };
}

export async function handleCheckoutCancellation(
  orderId: string,
  userId?: string | null
): Promise<{ mode: "buy_now" | "cart" | "unknown" }> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, checkout_mode, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return { mode: "unknown" };
  }

  if (order.checkout_mode === "cart") {
    const ownerId = userId ?? order.user_id;
    if (ownerId) {
      await handleCartCheckoutReturn(orderId, ownerId);
    }
    return { mode: "cart" };
  }

  if (order.status === "pending") {
    try {
      await cancelPendingOrder(orderId);
    } catch {
      /* Best-effort */
    }
  }

  return { mode: "buy_now" };
}
