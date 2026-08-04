import type { WalletTransactionType } from "./types";

export type WalletHistoryTypeFilter = "all" | "purchase" | "cancellation_refund" | "withdrawal";

export type WalletHistoryQuery = {
  userId: string;
  startMonth: string;
  endMonth: string;
  type: WalletHistoryTypeFilter;
  search?: string;
  page: number;
  limit: number;
};

export type WalletHistoryResult = {
  items: import("./types").WalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getMonthOptions(count = 24): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  for (let index = 0; index < count; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    options.push({
      value: `${year}-${month}`,
      label: `${year}/${month}`,
    });
  }

  return options;
}

export function getDefaultMonthRange(): { startMonth: string; endMonth: string } {
  const now = new Date();
  const endMonth = formatYearMonth(now);
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    startMonth: formatYearMonth(previous),
    endMonth,
  };
}

export function getTwoYearsAgoIso(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 2);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function parseWalletHistoryTypeFilter(value: string | null): WalletHistoryTypeFilter {
  if (
    value === "purchase" ||
    value === "cancellation_refund" ||
    value === "withdrawal"
  ) {
    return value;
  }

  return "all";
}

export function normalizeMonthRange(
  startMonth: string | null,
  endMonth: string | null
): { startMonth: string; endMonth: string } {
  const defaults = getDefaultMonthRange();
  const monthOptions = new Set(getMonthOptions().map((option) => option.value));
  const twoYearsAgo = new Date(getTwoYearsAgoIso());

  let start = startMonth && MONTH_PATTERN.test(startMonth) ? startMonth : defaults.startMonth;
  let end = endMonth && MONTH_PATTERN.test(endMonth) ? endMonth : defaults.endMonth;

  if (!monthOptions.has(start)) {
    start = defaults.startMonth;
  }

  if (!monthOptions.has(end)) {
    end = defaults.endMonth;
  }

  if (start > end) {
    [start, end] = [end, start];
  }

  const startDate = monthToStartDate(start);
  if (startDate < twoYearsAgo) {
    start = formatYearMonth(twoYearsAgo);
  }

  return { startMonth: start, endMonth: end };
}

export function monthToStartDate(yearMonth: string): Date {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

export function monthToEndDate(yearMonth: string): Date {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export function resolveHistoryTypes(type: WalletHistoryTypeFilter): WalletTransactionType[] | null {
  if (type === "all") {
    return null;
  }

  if (type === "withdrawal") {
    return ["withdrawal", "withdrawal_reversal"];
  }

  return [type];
}

function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
