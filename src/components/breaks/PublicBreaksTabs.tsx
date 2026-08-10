"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { BreakCardClient } from "@/components/breaks/BreakCardClient";
import type { BreakListItem } from "@/lib/breaks/types";

export type PublicBreaksTab = "inProgress" | "completed";

type PublicBreaksTabsProps = {
  inProgressBreaks: BreakListItem[];
  completedBreaks: BreakListItem[];
  defaultTab: PublicBreaksTab;
};

const PAGE_SIZE = 10;

export function PublicBreaksTabs({
  inProgressBreaks,
  completedBreaks,
  defaultTab,
}: PublicBreaksTabsProps) {
  const t = useTranslations("breaks");
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<PublicBreaksTab>(defaultTab);
  const [page, setPage] = useState(1);

  const tabs: { id: PublicBreaksTab; label: string; count: number }[] = [
    {
      id: "inProgress",
      label: t("publicTabs.inProgress"),
      count: inProgressBreaks.length,
    },
    {
      id: "completed",
      label: t("publicTabs.completed"),
      count: completedBreaks.length,
    },
  ];

  const activeList = activeTab === "inProgress" ? inProgressBreaks : completedBreaks;
  const usePagination = activeTab === "completed";
  const totalPages = usePagination ? Math.max(1, Math.ceil(activeList.length / PAGE_SIZE)) : 1;
  const currentPage = Math.min(page, totalPages);

  const visibleList = useMemo(() => {
    if (!usePagination) {
      return activeList;
    }
    return activeList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [activeList, currentPage, usePagination]);

  function switchTab(next: PublicBreaksTab) {
    setActiveTab(next);
    setPage(1);
    const href = next === "completed" ? `${pathname}?tab=completed` : pathname;
    router.replace(href, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex max-w-full items-center gap-1 rounded-xl border border-slate-700/50 bg-slate-800/60 p-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                isActive
                  ? "bg-[#f5c563] font-bold text-slate-950 shadow-md"
                  : "font-medium text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
              {tab.count > 0 ? (
                <span className="ml-1 tabular-nums">({tab.count})</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {visibleList.length === 0 ? (
        <div className="glass-panel rounded-3xl px-6 py-16 text-center">
          <p className="text-muted">
            {activeTab === "completed" ? t("emptyCompleted") : t("empty")}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleList.map((breakItem) => (
            <BreakCardClient key={breakItem.id} breakItem={breakItem} />
          ))}
        </div>
      )}

      {usePagination && activeList.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-muted">
            {t("publicTabs.pageStatus", {
              page: currentPage,
              total: totalPages,
              count: activeList.length,
            })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-border px-3 py-1.5 text-muted transition hover:text-foreground disabled:opacity-40"
            >
              {t("publicTabs.prevPage")}
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="rounded-lg border border-border px-3 py-1.5 text-muted transition hover:text-foreground disabled:opacity-40"
            >
              {t("publicTabs.nextPage")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
