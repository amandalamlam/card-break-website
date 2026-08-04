import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderItem, OrderPaymentType, OrderSummary } from "@/lib/wallet/types";

export type OrderWithItems = OrderSummary & {
  user_id: string;
  break_id: string | null;
  slot_id: string | null;
  currency: string;
  status: string;
  stripe_checkout_session_id: string | null;
};

const ORDER_WITH_ITEMS_SELECT = `
  id,
  user_id,
  break_id,
  slot_id,
  total_amount,
  credit_paid,
  stripe_paid,
  payment_type,
  amount,
  credit_amount,
  currency,
  status,
  stripe_checkout_session_id,
  order_items (
    id,
    order_id,
    break_id,
    slot_id,
    break_title,
    position_name,
    price
  )
`;

function normalizeOrder(row: OrderWithItems | null): OrderWithItems | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    order_items: (row.order_items ?? []) as OrderItem[],
  };
}

export async function getOrderByCheckoutSessionId(sessionId: string): Promise<OrderWithItems | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("orders")
    .select(ORDER_WITH_ITEMS_SELECT)
    .eq("stripe_checkout_session_id", sessionId)
    .single();

  if (error) {
    return null;
  }

  return normalizeOrder(data as OrderWithItems);
}

export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("orders")
    .select(ORDER_WITH_ITEMS_SELECT)
    .eq("id", orderId)
    .single();

  if (error) {
    return null;
  }

  return normalizeOrder(data as OrderWithItems);
}

export type PaymentReceipt = {
  orderId: string;
  totalAmount: number;
  creditPaid: number;
  stripePaid: number;
  paymentType: OrderPaymentType;
  items: OrderItem[];
  breakId: string | null;
};

export function buildPaymentReceipt(order: OrderWithItems): PaymentReceipt {
  const totalAmount = Number(order.total_amount ?? order.amount ?? 0);
  const creditPaid = Number(order.credit_paid ?? order.credit_amount ?? 0);
  const stripePaid = Number(order.stripe_paid ?? Math.max(totalAmount - creditPaid, 0));

  let paymentType = order.payment_type as OrderPaymentType | null;
  if (!paymentType) {
    if (creditPaid >= totalAmount) {
      paymentType = "credit";
    } else if (creditPaid > 0) {
      paymentType = "hybrid";
    } else {
      paymentType = "stripe";
    }
  }

  const items = order.order_items ?? [];
  const breakId = items[0]?.break_id ?? order.break_id ?? null;

  return {
    orderId: order.id,
    totalAmount,
    creditPaid,
    stripePaid,
    paymentType,
    items,
    breakId,
  };
}
