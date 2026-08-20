"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useTranslations } from "next-intl";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { WalletHistorySkeleton } from "@/components/ui/skeletons/WalletHistorySkeleton";
import { WalletActivityList } from "@/components/account/WalletActivityList";
import type { WalletActivityViewModel } from "@/lib/wallet/display";
import type { WalletHistoryTypeFilter } from "@/lib/wallet/history";

type MonthOption = {
  value: string;
  label: string;
};

type WalletHistoryPanelProps = {
  locale: string;
  monthOptions: MonthOption[];
  defaultStartMonth: string;
  defaultEndMonth: string;
};

type HistoryResponse = {
  activities: WalletActivityViewModel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  startMonth: string;
  endMonth: string;
  type: WalletHistoryTypeFilter;
};

const TYPE_OPTIONS: WalletHistoryTypeFilter[] = [
  "all",
  "purchase",
  "cancellation_refund",
  "withdrawal",
];

export function WalletHistoryPanel({
  locale,
  monthOptions,
  defaultStartMonth,
  defaultEndMonth,
}: WalletHistoryPanelProps) {
  const t = useTranslations("account.walletHistory");
  const tCommon = useTranslations("common");

  const [startMonth, setStartMonth] = useState(defaultStartMonth);
  const [endMonth, setEndMonth] = useState(defaultEndMonth);
  const [type, setType] = useState<WalletHistoryTypeFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      startMonth,
      endMonth,
      type,
      search,
      page: String(page),
      limit: "10",
      locale,
    });

    try {
      const response = await fetch(`/api/wallet/history?${params.toString()}`);
      const payload = (await response.json()) as HistoryResponse & { error?: string };

      if (!response.ok) {
        setError(t("loadError"));
        setLoading(false);
        return;
      }

      setData(payload);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [endMonth, locale, page, search, startMonth, t, type]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  function handleApplyFilters(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setMobileFiltersOpen(false);
  }

  function handleStartMonthChange(value: string) {
    setStartMonth(value);
    if (value > endMonth) {
      setEndMonth(value);
    }
    setPage(1);
  }

  function handleEndMonthChange(value: string) {
    setEndMonth(value);
    if (value < startMonth) {
      setStartMonth(value);
    }
    setPage(1);
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (startMonth !== defaultStartMonth) {
      count += 1;
    }
    if (endMonth !== defaultEndMonth) {
      count += 1;
    }
    if (type !== "all") {
      count += 1;
    }
    if (search) {
      count += 1;
    }

    return count;
  }, [defaultEndMonth, defaultStartMonth, endMonth, search, startMonth, type]);

  const pageNumbers = useMemo(() => {
    const totalPages = data?.totalPages ?? 1;
    const current = data?.page ?? 1;
    const pages: number[] = [];

    const start = Math.max(1, current - 2);
    const end = Math.min(totalPages, start + 4);

    for (let index = start; index <= end; index += 1) {
      pages.push(index);
    }

    return pages;
  }, [data?.page, data?.totalPages]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <form
        onSubmit={handleApplyFilters}
        className="glass-panel space-y-3 rounded-3xl p-4 sm:space-y-4 sm:p-6"
      >
        <div className="flex gap-2 md:hidden">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="min-w-0 flex-1 rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none transition focus:border-accent/50"
          />
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((current) => !current)}
            aria-expanded={mobileFiltersOpen}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm text-muted transition hover:text-foreground"
          >
            <Filter className="h-4 w-4" aria-hidden />
            <span>{t("filterToggle")}</span>
            {activeFilterCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-semibold text-accent-soft">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        <div
          className={`space-y-3 sm:space-y-4 ${mobileFiltersOpen ? "block" : "hidden"} md:block`}
        >
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.18em] text-muted">
                {t("startMonth")}
              </label>
              <select
                value={startMonth}
                onChange={(event) => handleStartMonthChange(event.target.value)}
                className="form-select mt-2 w-full"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.18em] text-muted">
                {t("endMonth")}
              </label>
              <select
                value={endMonth}
                onChange={(event) => handleEndMonthChange(event.target.value)}
                className="form-select mt-2 w-full"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.18em] text-muted">
                {t("typeFilter")}
              </label>
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as WalletHistoryTypeFilter);
                  setPage(1);
                }}
                className="form-select mt-2 w-full"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`types.${option}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden md:block">
              <label className="text-xs uppercase tracking-[0.18em] text-muted">
                {t("searchLabel")}
              </label>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="mt-2 w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm outline-none transition focus:border-accent/50"
              />
            </div>
          </div>

          <LoadingButton
            type="submit"
            loading={loading}
            loadingText={tCommon("processing")}
            className="rounded-xl border border-border px-5 py-2.5 text-sm text-muted transition hover:text-foreground disabled:opacity-60"
          >
            {t("applyFilters")}
          </LoadingButton>
        </div>
      </form>

      {loading ? (
        <WalletHistorySkeleton />
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : (
        <>
          <WalletActivityList
            activities={data?.activities ?? []}
            noTransactions={t("noTransactions")}
          />

          {(data?.totalPages ?? 1) > 1 ? (
            <nav className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-border px-3 py-2 text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("prevPage")}
              </button>

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`min-w-9 rounded-lg border px-3 py-2 transition ${
                    pageNumber === page
                      ? "border-accent/50 bg-accent/10 text-accent-soft"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(data?.totalPages ?? 1, current + 1))}
                disabled={page >= (data?.totalPages ?? 1)}
                className="rounded-lg border border-border px-3 py-2 text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("nextPage")}
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
