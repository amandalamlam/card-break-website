export type WalletTransactionType =
  | "cancellation_refund"
  | "purchase"
  | "checkout_release"
  | "admin_adjustment";

export type OrderPaymentType = "credit" | "stripe" | "hybrid";

export type OrderItem = {
  id: string;
  order_id: string;
  break_id: string;
  slot_id: string | null;
  break_title: string;
  position_name: string;
  price: number;
};

export type OrderSummary = {
  id: string;
  total_amount: number;
  credit_paid: number;
  stripe_paid: number;
  payment_type: OrderPaymentType | null;
  /** @deprecated legacy column */
  amount?: number;
  /** @deprecated legacy column */
  credit_amount?: number;
  order_items: OrderItem[];
};

export type WalletTransaction = {
  id: string;
  user_id: string;
  order_id: string | null;
  break_id: string | null;
  amount: number;
  type: WalletTransactionType;
  description: string;
  created_at: string;
  orders: OrderSummary | null;
};

export type WalletBalance = {
  storeCredit: number;
  creditReserved: number;
  availableCredit: number;
};

export function parseWalletBalance(profile: {
  store_credit: number | string;
  credit_reserved?: number | string | null;
}): WalletBalance {
  const storeCredit = Number(profile.store_credit);
  const creditReserved = Number(profile.credit_reserved ?? 0);

  return {
    storeCredit,
    creditReserved,
    availableCredit: storeCredit,
  };
}

export function clampCreditAmount(
  requested: number,
  slotPrice: number,
  availableCredit: number
): number {
  const safeRequested = Math.max(0, requested);
  const maxApplicable = Math.min(slotPrice, availableCredit);
  return Math.min(safeRequested, maxApplicable);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveOrderTotal(order: Pick<OrderSummary, "total_amount" | "amount">): number {
  return Number(order.total_amount ?? order.amount ?? 0);
}

export function resolveOrderCreditPaid(
  order: Pick<OrderSummary, "credit_paid" | "credit_amount">
): number {
  const creditPaid = Number(order.credit_paid ?? 0);
  if (creditPaid > 0) {
    return creditPaid;
  }
  return Number(order.credit_amount ?? 0);
}

export function resolveOrderStripePaid(
  order: Pick<OrderSummary, "stripe_paid" | "total_amount" | "amount" | "credit_paid" | "credit_amount">
): number {
  const stripePaid = Number(order.stripe_paid ?? 0);
  if (stripePaid > 0) {
    return stripePaid;
  }
  return Math.max(resolveOrderTotal(order) - resolveOrderCreditPaid(order), 0);
}
