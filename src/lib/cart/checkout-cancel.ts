import { createAdminClient } from "@/lib/supabase/admin";

export type CartCheckoutReturnResult = {
  handled: boolean;
  notice: "cancelled" | "expired" | null;
};

async function releaseOrderCreditSafe(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("release_order_credit", { p_order_id: orderId });
  if (error && process.env.NODE_ENV !== "production") {
    console.error("[releaseOrderCreditSafe]", orderId, error.message);
  }
}

async function cancelPendingOrderRecord(orderId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending");
}

async function expireCartFully(cartId: string, userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: items } = await admin
    .from("cart_items")
    .select("slot_id")
    .eq("cart_id", cartId);

  for (const item of items ?? []) {
    await admin
      .from("break_slots")
      .update({
        status: "available",
        user_id: null,
        locked_at: null,
        lock_type: null,
        lock_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.slot_id)
      .eq("user_id", userId)
      .eq("status", "locked");
  }

  await admin.from("cart_items").delete().eq("cart_id", cartId);
  await admin
    .from("carts")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("id", cartId);
}

async function cancelCartCheckoutPreserve(orderId: string, cartId: string): Promise<void> {
  await releaseOrderCreditSafe(orderId);
  await cancelPendingOrderRecord(orderId);

  const admin = createAdminClient();
  await admin
    .from("carts")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", cartId)
    .eq("status", "checkout");
}

async function cancelCartCheckoutExpired(
  orderId: string,
  cartId: string,
  userId: string
): Promise<void> {
  await releaseOrderCreditSafe(orderId);
  await cancelPendingOrderRecord(orderId);
  await expireCartFully(cartId, userId);
}

function isCartExpired(cart: { expires_at: string; status: string } | null): boolean {
  if (!cart || cart.status === "expired") {
    return true;
  }
  return new Date(cart.expires_at).getTime() <= Date.now();
}

export async function handleCartCheckoutReturn(
  orderId: string,
  userId: string
): Promise<CartCheckoutReturnResult> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, status, checkout_mode, cart_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.user_id !== userId || order.checkout_mode !== "cart" || !order.cart_id) {
    return { handled: false, notice: null };
  }

  const { data: cart } = await admin
    .from("carts")
    .select("id, expires_at, status")
    .eq("id", order.cart_id)
    .maybeSingle();

  const expired = isCartExpired(cart);

  if (order.status === "pending") {
    if (expired) {
      await cancelCartCheckoutExpired(orderId, order.cart_id, userId);
    } else {
      await cancelCartCheckoutPreserve(orderId, order.cart_id);
    }
    return { handled: true, notice: expired ? "expired" : "cancelled" };
  }

  if (expired && cart && cart.status !== "expired") {
    await expireCartFully(order.cart_id, userId);
    return { handled: true, notice: "expired" };
  }

  return { handled: true, notice: expired ? "expired" : "cancelled" };
}
