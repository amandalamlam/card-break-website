import { revalidatePublicBreaksList } from "@/lib/breaks/revalidate-public-list";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WalletTransaction } from "./types";

export type CreateCheckoutOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; code: string; message: string };

export type CancelBreakResult =
  | {
      ok: true;
      refundedOrders: number;
      refundedSlots: number;
      releasedLocks: number;
    }
  | { ok: false; code: string; message: string };

function parseRpcError(error: { message?: string; details?: string; hint?: string }): string {
  const message = [error.message, error.details, error.hint].filter(Boolean).join(" ");

  if (!message) {
    return "UNKNOWN";
  }

  if (message.includes("INSUFFICIENT_CREDIT")) return "INSUFFICIENT_CREDIT";
  if (message.includes("CREDIT_EXCEEDS_PRICE")) return "CREDIT_EXCEEDS_PRICE";
  if (message.includes("INVALID_CREDIT_AMOUNT")) return "INVALID_CREDIT_AMOUNT";
  if (message.includes("SLOT_LOCK_EXPIRED")) return "LOCK_EXPIRED";
  if (message.includes("SLOT_NOT_FOUND")) return "SLOT_NOT_FOUND";
  if (message.includes("BREAK_NOT_ACTIVE")) return "BREAK_NOT_ACTIVE";
  if (message.includes("NOT_CREDIT_ONLY_ORDER")) return "NOT_CREDIT_ONLY_ORDER";
  if (message.includes("BREAK_NOT_FOUND")) return "BREAK_NOT_FOUND";
  if (message.includes("BREAK_CANNOT_BE_CANCELLED")) return "BREAK_CANNOT_BE_CANCELLED";
  if (message.includes("PENDING_ORDER_CANCEL_FAILED")) return "PENDING_ORDER_CANCEL_FAILED";
  if (message.includes("FOR UPDATE is not allowed with DISTINCT")) return "CANCEL_QUERY_FAILED";
  if (message.includes("cannot cast type record to orders")) return "CANCEL_QUERY_FAILED";
  if (message.includes("credit_reserved")) return "WALLET_CLEANUP_FAILED";

  return "UNKNOWN";
}

export async function createCheckoutOrder(
  userId: string,
  breakId: string,
  slotId: string,
  creditAmount: number
): Promise<CreateCheckoutOrderResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("create_checkout_order", {
    p_user_id: userId,
    p_break_id: breakId,
    p_slot_id: slotId,
    p_credit_amount: creditAmount,
  });

  if (error) {
    const code = parseRpcError(error);
    return { ok: false, code, message: code };
  }

  if (!data) {
    return { ok: false, code: "UNKNOWN", message: "UNKNOWN" };
  }

  return { ok: true, orderId: String(data) };
}

export async function fulfillCreditOnlyOrder(orderId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("fulfill_credit_only_order", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const fulfilled = Boolean(data);
  if (fulfilled) {
    revalidatePublicBreaksList();
  }

  return fulfilled;
}

export async function cancelBreakAndRefund(breakId: string): Promise<CancelBreakResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("cancel_break_and_refund", {
    p_break_id: breakId,
  });

  if (error) {
    const code = parseRpcError(error);
    console.error("[cancelBreakAndRefund]", error.message, error.details, error.hint);
    return { ok: false, code, message: error.message ?? code };
  }

  const result = data as {
    refunded_orders?: number;
    refunded_slots?: number;
    released_locks?: number;
  };

  revalidatePublicBreaksList();

  return {
    ok: true,
    refundedOrders: result.refunded_orders ?? 0,
    refundedSlots: result.refunded_slots ?? 0,
    releasedLocks: result.released_locks ?? 0,
  };
}

const WALLET_TRANSACTIONS_SELECT = `
  id,
  user_id,
  order_id,
  break_id,
  amount,
  type,
  description,
  created_at,
  orders (
    id,
    total_amount,
    credit_paid,
    stripe_paid,
    payment_type,
    amount,
    credit_amount,
    order_items (
      id,
      order_id,
      break_id,
      slot_id,
      break_title,
      position_name,
      price
    )
  )
`;

export async function getUserWalletTransactions(
  userId: string,
  limit = 10
): Promise<WalletTransaction[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("wallet_transactions")
    .select(WALLET_TRANSACTIONS_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Fallback for databases that haven't renamed credit_transactions yet
    const legacy = await admin
      .from("credit_transactions")
      .select(WALLET_TRANSACTIONS_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (legacy.error) {
      throw new Error(error.message);
    }

    return normalizeWalletTransactions(legacy.data ?? []);
  }

  return normalizeWalletTransactions(data ?? []);
}

function normalizeWalletTransactions(rows: unknown[]): WalletTransaction[] {
  return rows.map((row) => {
    const tx = row as WalletTransaction & {
      orders: WalletTransaction["orders"] | WalletTransaction["orders"][];
    };

    const orders = Array.isArray(tx.orders) ? (tx.orders[0] ?? null) : tx.orders;

    return {
      ...tx,
      orders: orders
        ? {
            ...orders,
            order_items: orders.order_items ?? [],
          }
        : null,
    };
  });
}

/** @deprecated Use getUserWalletTransactions */
export const getUserCreditTransactions = getUserWalletTransactions;
