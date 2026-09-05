"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AdminEditBreakDrawer } from "@/components/admin/AdminEditBreakDrawer";
import { CancelBreakButton } from "@/components/admin/CancelBreakButton";
import { CompleteBreakButton } from "@/components/admin/CompleteBreakButton";
import { BreakStatusBadgeClient } from "@/components/breaks/BreakStatusBadgeClient";
import type { AdminBreakDetail, BreakStatus } from "@/lib/breaks/types";

type AdminBreaksPanelProps = {
  breaks: AdminBreakDetail[];
};

type BreakSubTab = "inProgress" | "completed" | "cancelled";

const IN_PROGRESS_STATUSES: BreakStatus[] = ["active", "sold_out"];
const PAGE_SIZE = 10;

function sortByCreatedDesc(items: AdminBreakDetail[]): AdminBreakDetail[] {
  return [...items].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function BreakCard({
  breakItem,
  onEdit,
  showActions,
}: {
  breakItem: AdminBreakDetail;
  onEdit: (item: AdminBreakDetail) => void;
  showActions: boolean;
}) {
  const t = useTranslations("admin");

  return (
    <article className="glass-panel flex flex-col gap-4 rounded-2xl p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">{breakItem.title}</h2>
          <BreakStatusBadgeClient status={breakItem.status} />
        </div>
        <p className="text-sm text-muted">
          {t("slotsSummary", {
            available: breakItem.available_count,
            total: breakItem.total_count,
          })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/breaks/${breakItem.id}`}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground"
        >
          {t("viewPublicPage")}
        </Link>
        {showActions ? (
          <>
            <button
              type="button"
              onClick={() => onEdit(breakItem)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground"
            >
              {t("editBreak.action")}
            </button>
            <CompleteBreakButton
              breakId={breakItem.id}
              breakTitle={breakItem.title}
              existingVideoUrl={breakItem.video_url}
            />
            <CancelBreakButton breakId={breakItem.id} breakTitle={breakItem.title} />
          </>
        ) : null}
      </div>
    </article>
  );
}

export function AdminBreaksPanel({ breaks }: AdminBreaksPanelProps) {
  const t = useTranslations("admin");
  const [editBreak, setEditBreak] = useState<AdminBreakDetail | null>(null);
  const [subTab, setSubTab] = useState<BreakSubTab>("inProgress");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const grouped = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matchesSearch = (item: AdminBreakDetail) =>
      query.length === 0 || item.title.toLowerCase().includes(query);

    return {
      inProgress: sortByCreatedDesc(
        breaks.filter(
          (item) => IN_PROGRESS_STATUSES.includes(item.status) && matchesSearch(item)
        )
      ),
      completed: sortByCreatedDesc(
        breaks.filter((item) => item.status === "completed" && matchesSearch(item))
      ),
      cancelled: sortByCreatedDesc(
        breaks.filter((item) => item.status === "cancelled" && matchesSearch(item))
      ),
    };
  }, [breaks, search]);

  const activeList = grouped[subTab];
  const usePagination = subTab === "completed" || subTab === "cancelled";
  const totalPages = usePagination ? Math.max(1, Math.ceil(activeList.length / PAGE_SIZE)) : 1;
  const currentPage = Math.min(page, totalPages);
  const visibleList = usePagination
    ? activeList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : activeList;

  const subTabs: { id: BreakSubTab; label: string; count: number }[] = [
    {
      id: "inProgress",
      label: t("breakSubTabs.inProgress"),
      count: grouped.inProgress.length,
    },
    {
      id: "completed",
      label: t("breakSubTabs.completed"),
      count: grouped.completed.length,
    },
    {
      id: "cancelled",
      label: t("breakSubTabs.cancelled"),
      count: grouped.cancelled.length,
    },
  ];

  function switchTab(next: BreakSubTab) {
    setSubTab(next);
    setPage(1);
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{t("dashboardSubtitle")}</p>
          <Link
            href="/admin/breaks/new"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-accent-soft"
          >
            {t("createBreak")}
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex w-fit max-w-full items-center gap-1 rounded-xl border border-slate-700/50 bg-slate-800/60 p-1">
            {subTabs.map((tab) => {
              const isActive = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-[#f5c563] font-bold text-slate-950 shadow-md"
                      : "font-medium text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                  {tab.id === "inProgress" && tab.count > 0 ? (
                    <span className="ml-1 tabular-nums">({tab.count})</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <label className="block w-full max-w-xs text-sm lg:ml-auto">
            <span className="sr-only">{t("breakSubTabs.searchLabel")}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("breakSubTabs.searchPlaceholder")}
              className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="space-y-3">
          {visibleList.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted">
              {t(`breakSubTabs.empty.${subTab}`)}
            </p>
          ) : (
            visibleList.map((breakItem) => (
              <BreakCard
                key={breakItem.id}
                breakItem={breakItem}
                onEdit={setEditBreak}
                showActions={subTab === "inProgress"}
              />
            ))
          )}
        </div>

        {usePagination && activeList.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="text-muted">
              {t("breakSubTabs.pageStatus", {
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
                {t("breakSubTabs.prevPage")}
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="rounded-lg border border-border px-3 py-1.5 text-muted transition hover:text-foreground disabled:opacity-40"
              >
                {t("breakSubTabs.nextPage")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <AdminEditBreakDrawer
        open={editBreak !== null}
        onClose={() => setEditBreak(null)}
        breakItem={editBreak}
      />
    </>
  );
}
