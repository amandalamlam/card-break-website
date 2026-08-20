import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BreakCardStatusBadge } from "@/components/breaks/StatusBadge";
import { stripHtmlToPlainText } from "@/lib/breaks/sanitize-html";
import type { BreakListItem } from "@/lib/breaks/types";

type BreakCardProps = {
  breakItem: BreakListItem;
};

export async function BreakCard({ breakItem }: BreakCardProps) {
  const t = await getTranslations("breaks");
  const isCancelled = breakItem.status === "cancelled";
  const isCompleted = breakItem.status === "completed";

  const summary =
    isCompleted
      ? t("completedCardHint")
      : !isCancelled && breakItem.total_count > 0
        ? t("slotsSummary", {
            available: breakItem.available_count,
            total: breakItem.total_count,
          })
        : !isCancelled
          ? t("noSlots")
          : null;

  return (
    <Link
      href={`/breaks/${breakItem.id}`}
      className={`glass-panel group flex h-full flex-col overflow-hidden rounded-3xl transition ${
        isCancelled
          ? "border-slate-700/60 bg-slate-900/20 hover:border-slate-600/70"
          : "hover:border-accent/40"
      }`}
    >
      <div className="relative aspect-[16/10] bg-surface-elevated">
        {breakItem.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={breakItem.image_url}
            alt={breakItem.title}
            className={`h-full w-full object-cover transition duration-300 ${
              isCancelled ? "opacity-70 saturate-[0.85]" : "group-hover:scale-[1.02]"
            }`}
          />
        ) : (
          <div
            className={`flex h-full items-center justify-center bg-gradient-to-br from-accent/10 via-transparent to-success/10 text-4xl ${
              isCancelled ? "opacity-70" : ""
            }`}
          >
            🃏
          </div>
        )}

        {isCancelled ? <div className="absolute inset-0 bg-slate-950/30" aria-hidden="true" /> : null}

        <div className="absolute left-4 top-4">
          <BreakCardStatusBadge status={breakItem.status} />
        </div>
      </div>

      <div className={`flex flex-1 flex-col p-5 ${isCancelled ? "text-slate-300" : ""}`}>
        <h3
          className={`text-lg font-semibold tracking-tight ${
            isCancelled ? "text-slate-100" : "group-hover:text-accent-soft"
          }`}
        >
          {breakItem.title}
        </h3>
        <p className="mt-3 line-clamp-2 min-h-[3rem] text-sm leading-6 text-muted">
          {stripHtmlToPlainText(breakItem.description) || breakItem.description}
        </p>
        <div
          className={`mt-auto flex items-center pt-3 text-sm ${
            summary ? "justify-between gap-3" : "justify-end"
          }`}
        >
          {summary ? <span className="text-muted">{summary}</span> : null}
          <span className={`shrink-0 font-medium ${isCancelled ? "text-slate-400" : "text-accent-soft"}`}>
            {t("viewBreak")}
          </span>
        </div>
      </div>
    </Link>
  );
}
