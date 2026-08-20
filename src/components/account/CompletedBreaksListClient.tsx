"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { USER_SHIPPING_STATUS_BADGE_CLASS } from "@/lib/shipping/admin-display";
import type { CompletedBreakShipping } from "@/lib/shipping/types";

const PAGE_SIZE = 10;

type CompletedBreaksListClientProps = {
  breaks: CompletedBreakShipping[];
};

export function CompletedBreaksListClient({ breaks }: CompletedBreaksListClientProps) {
  const t = useTranslations("shipping");
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(breaks.length / PAGE_SIZE));

  const paginatedBreaks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return breaks.slice(start, start + PAGE_SIZE);
  }, [breaks, page]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);

    for (let index = start; index <= end; index += 1) {
      pages.push(index);
    }

    return pages;
  }, [page, totalPages]);

  if (breaks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted">
        {t("noCompletedBreaks")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paginatedBreaks.map((item) => (
          <article
            key={item.breakId}
            className="glass-panel flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{item.title}</p>
              <p className="text-muted">
                {t("slotsWon")}: {item.slotNames.join(", ")}
              </p>
              {item.shippingRequest ? (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <p className="text-xs text-muted">
                    {t("statusSubmitted", {
                      option: item.shippingRequest.option_name,
                    })}
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${USER_SHIPPING_STATUS_BADGE_CLASS[item.shippingRequest.status]}`}
                  >
                    {t(`receipt.statusValues.${item.shippingRequest.status}`)}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-amber-200/90">{t("actionNeeded")}</p>
              )}
            </div>

            <Link
              href={`/account/shipping/${item.breakId}`}
              className={`inline-flex rounded-xl px-4 py-2 text-sm font-semibold transition ${
                item.shippingRequest
                  ? "border border-border text-muted hover:text-foreground"
                  : "bg-accent text-background hover:bg-accent-soft"
              }`}
            >
              {item.shippingRequest ? t("viewReceipt") : t("selectDelivery")}
            </Link>
          </article>
        ))}
      </div>

      {totalPages > 1 ? (
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
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-border px-3 py-2 text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("nextPage")}
          </button>
        </nav>
      ) : null}
    </div>
  );
}
