import { formatPrice } from "@/lib/breaks/format";
import type { WalletTransaction } from "./types";
import { resolveOrderCreditPaid, resolveOrderStripePaid, resolveOrderTotal } from "./types";

export type WalletActivityCopy = {
  positionsUnit: string;
  paymentBreakdown: {
    creditFull: string;
    hybrid: string;
    stripeFull: string;
    stripePartial: string;
  };
  transactionTypes: Record<string, string>;
};

export type WalletActivityViewModel = {
  id: string;
  typeLabel: string;
  itemDetails: string | null;
  metadata: string;
  amount: {
    sign: "+" | "-";
    value: number;
    isCredit: boolean;
  };
};

function formatWalletActivityDate(createdAt: string, locale: string): string {
  return new Date(createdAt)
    .toLocaleString(locale, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ");
}

function formatWalletActivityItemDetails(tx: WalletTransaction, copy: WalletActivityCopy): string | null {
  const items = tx.orders?.order_items;

  if (!items?.length) {
    return null;
  }

  if (items.length === 1) {
    const item = items[0];
    return `${item.break_title} (${item.position_name})`;
  }

  const breakTitle = items[0]?.break_title ?? "—";
  return `${breakTitle} (${items.length}${copy.positionsUnit})`;
}

function formatWalletActivityPaymentBreakdown(
  tx: WalletTransaction,
  copy: WalletActivityCopy
): string | null {
  if (tx.type !== "purchase" || !tx.orders) {
    return null;
  }

  const creditPaid = resolveOrderCreditPaid(tx.orders);
  const stripePaid = resolveOrderStripePaid(tx.orders);
  const paymentType = tx.orders.payment_type;

  if (paymentType === "credit" || (creditPaid > 0 && stripePaid <= 0)) {
    return copy.paymentBreakdown.creditFull;
  }

  if (paymentType === "hybrid" || (creditPaid > 0 && stripePaid > 0)) {
    return copy.paymentBreakdown.hybrid
      .replace("{credit}", formatPrice(creditPaid))
      .replace("{stripe}", formatPrice(stripePaid));
  }

  if (stripePaid > 0) {
    const stripeTemplate =
      creditPaid <= 0 ? copy.paymentBreakdown.stripeFull : copy.paymentBreakdown.stripePartial;

    return stripeTemplate.replace("{amount}", formatPrice(stripePaid));
  }

  return null;
}

function formatWalletActivityAmount(tx: WalletTransaction): WalletActivityViewModel["amount"] {
  if (tx.type === "purchase" && tx.orders) {
    const total = resolveOrderTotal(tx.orders);
    return {
      sign: "-",
      value: total,
      isCredit: false,
    };
  }

  const amount = Number(tx.amount);
  const isCredit = amount >= 0;

  return {
    sign: isCredit ? "+" : "-",
    value: Math.abs(amount),
    isCredit,
  };
}

export function buildWalletActivityViewModel(
  tx: WalletTransaction,
  locale: string,
  copy: WalletActivityCopy
): WalletActivityViewModel {
  const formattedDate = formatWalletActivityDate(tx.created_at, locale);
  const paymentBreakdown = formatWalletActivityPaymentBreakdown(tx, copy);

  const metadata = paymentBreakdown
    ? `${formattedDate} • ${paymentBreakdown}`
    : tx.description.trim()
      ? `${formattedDate} • ${tx.description}`
      : formattedDate;

  return {
    id: tx.id,
    typeLabel: copy.transactionTypes[tx.type] ?? tx.type,
    itemDetails: formatWalletActivityItemDetails(tx, copy),
    metadata,
    amount: formatWalletActivityAmount(tx),
  };
}
