"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AdminEditBreakDrawer } from "@/components/admin/AdminEditBreakDrawer";
import { BreakStatusBadgeClient } from "@/components/breaks/BreakStatusBadgeClient";
import { CancelBreakButton } from "@/components/admin/CancelBreakButton";
import type { AdminBreakDetail, BreakStatus } from "@/lib/breaks/types";

type AdminBreaksPanelProps = {
  breaks: AdminBreakDetail[];
};

const IN_PROGRESS_STATUSES: BreakStatus[] = ["active", "sold_out"];

function sortByCreatedDesc(items: AdminBreakDetail[]): AdminBreakDetail[] {
  return [...items].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function sortByCreatedAsc(items: AdminBreakDetail[]): AdminBreakDetail[] {
  return [...items].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}

function BreakCard({
  breakItem,
  onEdit,
  t,
}: {
  breakItem: AdminBreakDetail;
  onEdit: (item: AdminBreakDetail) => void;
  t: ReturnType<typeof useTranslations<"admin">>;
}) {
  const isEditable = IN_PROGRESS_STATUSES.includes(breakItem.status);

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
        {isEditable ? (
          <>
            <button
              type="button"
              onClick={() => onEdit(breakItem)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground"
            >
              {t("editBreak.action")}
            </button>
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

  const { inProgress, completed, cancelled } = useMemo(() => {
    const inProgressItems = sortByCreatedDesc(
      breaks.filter((item) => IN_PROGRESS_STATUSES.includes(item.status))
    );
    const completedItems = sortByCreatedAsc(
      breaks.filter((item) => item.status === "completed")
    );
    const cancelledItems = sortByCreatedDesc(
      breaks.filter((item) => item.status === "cancelled")
    );

    return {
      inProgress: inProgressItems,
      completed: completedItems,
      cancelled: cancelledItems,
    };
  }, [breaks]);

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{t("dashboardSubtitle")}</p>
          <Link
            href="/admin/breaks/new"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-accent-soft"
          >
            {t("createBreak")}
          </Link>
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">{t("breakSections.inProgressTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("breakSections.inProgressSubtitle")}</p>
          </div>
          {inProgress.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted">
              {t("breakSections.noInProgress")}
            </p>
          ) : (
            inProgress.map((breakItem) => (
              <BreakCard key={breakItem.id} breakItem={breakItem} onEdit={setEditBreak} t={t} />
            ))
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">{t("breakSections.completedTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("breakSections.completedSubtitle")}</p>
          </div>
          {completed.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted">
              {t("breakSections.noCompleted")}
            </p>
          ) : (
            completed.map((breakItem) => (
              <BreakCard key={breakItem.id} breakItem={breakItem} onEdit={setEditBreak} t={t} />
            ))
          )}
        </section>

        <details className="group rounded-2xl border border-border/70 bg-background/30">
          <summary className="cursor-pointer list-none px-5 py-4 marker:content-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{t("breakSections.cancelledTitle")}</h2>
                <p className="mt-1 text-sm text-muted">{t("breakSections.cancelledSubtitle")}</p>
              </div>
              <span className="text-sm text-muted group-open:rotate-180 transition-transform">▾</span>
            </div>
          </summary>
          <div className="space-y-3 border-t border-border/70 px-5 py-4">
            {cancelled.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted">
                {t("breakSections.noCancelled")}
              </p>
            ) : (
              cancelled.map((breakItem) => (
                <BreakCard key={breakItem.id} breakItem={breakItem} onEdit={setEditBreak} t={t} />
              ))
            )}
          </div>
        </details>
      </div>

      <AdminEditBreakDrawer
        open={editBreak !== null}
        onClose={() => setEditBreak(null)}
        breakItem={editBreak}
      />
    </>
  );
}
