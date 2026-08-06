import { createAdminClient } from "@/lib/supabase/admin";
import { CART_LOCK_MINUTES } from "@/lib/slots/constants";
import { getCartRemainingSeconds, uuidEquals } from "@/lib/slots/time";
import { getSupabaseRpcErrorText, parseCartRpcError } from "./rpc-errors";
import type { CartItem, CartWithItems } from "./types";

type AddToCartSuccess = {
  ok: true;
  cartId: string;
  cartItemId: string;
  expiresAt: string;
  isNewCart: boolean;
};

type AddToCartFailure = {
  ok: false;
  code: string;
  detail?: string;
};

function isSlotHoldActive(slot: {
  status: string;
  lock_expires_at?: string | null;
  locked_at?: string | null;
}): boolean {
  if (slot.status !== "locked") {
    return false;
  }

  if (slot.lock_expires_at) {
    return new Date(slot.lock_expires_at).getTime() > Date.now();
  }

  if (!slot.locked_at) {
    return false;
  }

  // Legacy locks without lock_expires_at
  return new Date(slot.locked_at).getTime() + CART_LOCK_MINUTES * 60 * 1000 > Date.now();
}

/**
 * Direct add-to-cart via admin client.
 * Avoids broken RPCs that call release_expired_slot_locks → credit_reserved crash.
 */
async function addSlotToCartDirect(
  userId: string,
  breakId: string,
  slotId: string
): Promise<AddToCartSuccess | AddToCartFailure> {
  const admin = createAdminClient();

  const { data: breakRow, error: breakError } = await admin
    .from("breaks")
    .select("id, title, status")
    .eq("id", breakId)
    .maybeSingle();

  if (breakError) {
    return { ok: false, code: "UNKNOWN", detail: breakError.message };
  }
  if (!breakRow) {
    return { ok: false, code: "SLOT_NOT_FOUND" };
  }
  if (breakRow.status !== "active") {
    return { ok: false, code: "BREAK_NOT_ACTIVE" };
  }

  const { data: slot, error: slotError } = await admin
    .from("break_slots")
    .select("id, break_id, name, price, status, user_id, locked_at, lock_type, lock_expires_at")
    .eq("id", slotId)
    .eq("break_id", breakId)
    .maybeSingle();

  if (slotError) {
    return { ok: false, code: "UNKNOWN", detail: slotError.message };
  }
  if (!slot) {
    return { ok: false, code: "SLOT_NOT_FOUND" };
  }

  // Reclaim expired hold on this slot (do not cancel orders — avoid wallet path)
  if (slot.status === "locked" && !isSlotHoldActive(slot)) {
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
      .eq("id", slotId)
      .eq("status", "locked");

    slot.status = "available";
    slot.user_id = null;
    slot.locked_at = null;
    slot.lock_type = null;
    slot.lock_expires_at = null;
  }

  if (isSlotHoldActive(slot)) {
    const ownCartLock =
      slot.lock_type === "cart" && uuidEquals(slot.user_id, userId);
    if (!ownCartLock) {
      return { ok: false, code: "SLOT_LOCKED_BY_OTHER" };
    }
  } else if (slot.status !== "available") {
    return { ok: false, code: "SLOT_UNAVAILABLE" };
  }

  const { data: fetchedCart, error: cartError } = await admin
    .from("carts")
    .select("id, expires_at, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (cartError) {
    // Table missing → migration not run
    if (cartError.message.includes("carts") || cartError.code === "42P01") {
      return { ok: false, code: "MIGRATION_REQUIRED", detail: cartError.message };
    }
    return { ok: false, code: "UNKNOWN", detail: cartError.message };
  }

  let isNewCart = false;
  let expiresAt: string;
  let cart = fetchedCart;

  if (!cart) {
    isNewCart = true;
    expiresAt = new Date(Date.now() + CART_LOCK_MINUTES * 60 * 1000).toISOString();
    const { data: created, error: createError } = await admin
      .from("carts")
      .insert({
        user_id: userId,
        expires_at: expiresAt,
        status: "active",
      })
      .select("id, expires_at, status")
      .single();

    if (createError || !created) {
      if (createError?.message.includes("carts") || createError?.code === "42P01") {
        return { ok: false, code: "MIGRATION_REQUIRED", detail: createError?.message };
      }
      // Unique active cart race — re-fetch
      const { data: raced } = await admin
        .from("carts")
        .select("id, expires_at, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (!raced) {
        return { ok: false, code: "UNKNOWN", detail: createError?.message };
      }
      cart = raced;
      isNewCart = false;
      expiresAt = raced.expires_at;
    } else {
      cart = created;
      expiresAt = created.expires_at;
    }
  } else {
    expiresAt = cart.expires_at;
    if (new Date(expiresAt).getTime() <= Date.now()) {
      return { ok: false, code: "CART_EXPIRED" };
    }
  }

  const { data: existingItem } = await admin
    .from("cart_items")
    .select("id")
    .eq("cart_id", cart.id)
    .eq("slot_id", slotId)
    .maybeSingle();

  if (existingItem) {
    return { ok: false, code: "SLOT_ALREADY_IN_CART" };
  }

  const { error: lockError } = await admin
    .from("break_slots")
    .update({
      status: "locked",
      user_id: userId,
      locked_at: new Date().toISOString(),
      lock_type: "cart",
      lock_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);

  if (lockError) {
    if (lockError.message.includes("lock_type") || lockError.message.includes("lock_expires_at")) {
      return { ok: false, code: "MIGRATION_REQUIRED", detail: lockError.message };
    }
    return { ok: false, code: "UNKNOWN", detail: lockError.message };
  }

  const { data: item, error: itemError } = await admin
    .from("cart_items")
    .insert({
      cart_id: cart.id,
      user_id: userId,
      break_id: breakId,
      slot_id: slotId,
      break_title: breakRow.title,
      position_name: slot.name,
      price: slot.price,
    })
    .select("id")
    .single();

  if (itemError || !item) {
    // Roll back slot lock best-effort
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
      .eq("id", slotId)
      .eq("user_id", userId);

    if (itemError?.message.includes("cart_items") || itemError?.code === "42P01") {
      return { ok: false, code: "MIGRATION_REQUIRED", detail: itemError?.message };
    }
    if (itemError?.message.includes("duplicate") || itemError?.code === "23505") {
      return { ok: false, code: "SLOT_ALREADY_IN_CART" };
    }
    return { ok: false, code: "UNKNOWN", detail: itemError?.message };
  }

  return {
    ok: true,
    cartId: cart.id,
    cartItemId: item.id,
    expiresAt,
    isNewCart,
  };
}

export async function addSlotToCart(
  userId: string,
  breakId: string,
  slotId: string
): Promise<AddToCartSuccess | AddToCartFailure> {
  // Prefer direct path so add-to-cart does not depend on broken wallet cleanup RPCs.
  const direct = await addSlotToCartDirect(userId, breakId, slotId);
  if (direct.ok || direct.code !== "MIGRATION_REQUIRED") {
    if (!direct.ok && process.env.NODE_ENV !== "production") {
      console.error("[addSlotToCart]", direct.code, direct.detail);
    }
    return direct;
  }

  // Fallback: try RPC if tables exist but direct path hit a rare migration edge case
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("add_slot_to_cart", {
    p_user_id: userId,
    p_break_id: breakId,
    p_slot_id: slotId,
    p_cart_duration_minutes: CART_LOCK_MINUTES,
  });

  if (error) {
    const code = parseCartRpcError(error);
    const detail = getSupabaseRpcErrorText(error);
    if (process.env.NODE_ENV !== "production") {
      console.error("[addSlotToCart rpc]", code, detail);
    }
    return { ok: false, code, detail };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    cart_id: string;
    cart_item_id: string;
    expires_at: string;
    is_new_cart: boolean;
  };

  return {
    ok: true,
    cartId: row.cart_id,
    cartItemId: row.cart_item_id,
    expiresAt: row.expires_at,
    isNewCart: row.is_new_cart,
  };
}

export async function removeCartItem(userId: string, cartItemId: string) {
  const admin = createAdminClient();

  const { data: item, error: fetchError } = await admin
    .from("cart_items")
    .select("id, cart_id, slot_id, user_id")
    .eq("id", cartItemId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false as const, code: parseCartRpcError(fetchError) };
  }
  if (!item) {
    return { ok: false as const, code: "CART_ITEM_NOT_FOUND" };
  }

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

  const { error: deleteError } = await admin
    .from("cart_items")
    .delete()
    .eq("id", cartItemId)
    .eq("user_id", userId);

  if (deleteError) {
    return { ok: false as const, code: parseCartRpcError(deleteError) };
  }

  const { count } = await admin
    .from("cart_items")
    .select("id", { count: "exact", head: true })
    .eq("cart_id", item.cart_id);

  if ((count ?? 0) === 0) {
    await admin
      .from("carts")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", item.cart_id);
  }

  return { ok: true as const };
}

export async function getActiveCart(userId: string): Promise<CartWithItems | null> {
  const admin = createAdminClient();

  // Best-effort; never block cart reads on wallet cleanup failures
  await admin.rpc("release_expired_slot_locks");

  const { data: cart, error } = await admin
    .from("carts")
    .select("id, user_id, expires_at, status, created_at, updated_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !cart) {
    return null;
  }

  if (new Date(cart.expires_at).getTime() <= Date.now()) {
    // Soft-expire locally; mark cart expired and free slots best-effort
    const { data: items } = await admin
      .from("cart_items")
      .select("slot_id")
      .eq("cart_id", cart.id);

    for (const row of items ?? []) {
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
        .eq("id", row.slot_id)
        .eq("status", "locked");
    }

    await admin
      .from("carts")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", cart.id);

    return null;
  }

  const { data: items } = await admin
    .from("cart_items")
    .select(
      "id, cart_id, user_id, break_id, slot_id, break_title, position_name, price, created_at"
    )
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  const cartItems = (items ?? []) as CartItem[];
  const totalAmount = cartItems.reduce((sum, item) => sum + Number(item.price), 0);

  return {
    ...cart,
    status: cart.status as CartWithItems["status"],
    items: cartItems,
    remainingSeconds: getCartRemainingSeconds(cart.expires_at),
    totalAmount,
  };
}

export async function createCartCheckoutOrder(userId: string, creditAmount: number) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_cart_checkout_order", {
    p_user_id: userId,
    p_credit_amount: creditAmount,
  });

  if (error) {
    const code = parseCartRpcError(error);
    return { ok: false as const, code, message: code };
  }

  return { ok: true as const, orderId: String(data) };
}
