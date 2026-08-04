import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTwoYearsAgoIso,
  monthToEndDate,
  monthToStartDate,
  normalizeMonthRange,
  resolveHistoryTypes,
  type WalletHistoryQuery,
  type WalletHistoryResult,
} from "./history";
import type { WalletTransaction } from "./types";

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

async function findMatchingOrderIds(userId: string, search: string): Promise<string[]> {
  const admin = createAdminClient();
  const term = `%${search.trim()}%`;

  const { data: orders } = await admin.from("orders").select("id").eq("user_id", userId);

  const orderIds = (orders ?? []).map((order) => order.id as string);
  if (orderIds.length === 0) {
    return [];
  }

  const { data: items } = await admin
    .from("order_items")
    .select("order_id")
    .in("order_id", orderIds)
    .or(`break_title.ilike.${term},position_name.ilike.${term}`);

  return [...new Set((items ?? []).map((item) => item.order_id as string))];
}

async function runHistoryQuery(
  table: "wallet_transactions" | "credit_transactions",
  params: WalletHistoryQuery,
  effectiveStart: string,
  rangeEndIso: string,
  page: number,
  limit: number,
  types: ReturnType<typeof resolveHistoryTypes>,
  search: string
): Promise<WalletHistoryResult | null> {
  const admin = createAdminClient();
  const offset = (page - 1) * limit;

  let query = admin
    .from(table)
    .select(WALLET_TRANSACTIONS_SELECT, { count: "exact" })
    .eq("user_id", params.userId)
    .gte("created_at", effectiveStart)
    .lte("created_at", rangeEndIso)
    .order("created_at", { ascending: false });

  if (types) {
    query = query.in("type", types);
  }

  if (search) {
    const matchingOrderIds = await findMatchingOrderIds(params.userId, search);
    const escaped = search.replace(/,/g, "");
    const filters = [`description.ilike.%${escaped}%`];

    if (matchingOrderIds.length > 0) {
      filters.push(`order_id.in.(${matchingOrderIds.join(",")})`);
    }

    query = query.or(filters.join(","));
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return null;
  }

  const total = count ?? 0;

  return {
    items: normalizeWalletTransactions(data ?? []),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function queryWalletHistory(params: WalletHistoryQuery): Promise<WalletHistoryResult> {
  const { startMonth, endMonth } = normalizeMonthRange(params.startMonth, params.endMonth);
  const types = resolveHistoryTypes(params.type);
  const page = Math.max(1, params.page);
  const limit = Math.min(Math.max(1, params.limit), 50);
  const twoYearsAgo = getTwoYearsAgoIso();
  const rangeStart = monthToStartDate(startMonth);
  const rangeEnd = monthToEndDate(endMonth);
  const effectiveStart =
    rangeStart.toISOString() < twoYearsAgo ? twoYearsAgo : rangeStart.toISOString();
  const search = params.search?.trim() ?? "";

  const primary = await runHistoryQuery(
    "wallet_transactions",
    params,
    effectiveStart,
    rangeEnd.toISOString(),
    page,
    limit,
    types,
    search
  );

  if (primary) {
    return primary;
  }

  const legacy = await runHistoryQuery(
    "credit_transactions",
    params,
    effectiveStart,
    rangeEnd.toISOString(),
    page,
    limit,
    types,
    search
  );

  if (!legacy) {
    throw new Error("Failed to load wallet history.");
  }

  return legacy;
}

export {
  parseWalletHistoryTypeFilter,
  normalizeMonthRange,
  getDefaultMonthRange,
  getMonthOptions,
} from "./history";
