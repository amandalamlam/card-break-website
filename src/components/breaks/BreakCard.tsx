import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BreakStatusBadge } from "@/components/breaks/StatusBadge";
import type { BreakListItem } from "@/lib/breaks/types";

type BreakCardProps = {
  breakItem: BreakListItem;
};

export async function BreakCard({ breakItem }: BreakCardProps) {
  const t = await getTranslations("breaks");

  const lowestPrice =
    breakItem.total_count > 0
      ? t("slotsSummary", {
          available: breakItem.available_count,
          total: breakItem.total_count,
        })
      : t("noSlots");

  return (
    <Link
      href={`/breaks/${breakItem.id}`}
      className="glass-panel group block rounded-3xl overflow-hidden transition hover:border-accent/40"
    >
      <div className="relative aspect-[16/10] bg-surface-elevated">
        {breakItem.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={breakItem.image_url}
            alt={breakItem.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent/10 via-transparent to-success/10 text-4xl">
            🃏
          </div>
        )}
        <div className="absolute left-4 top-4">
          <BreakStatusBadge status={breakItem.status} />
        </div>
      </div>

      <div className="space-y-3 p-5">
        <h3 className="text-lg font-semibold tracking-tight group-hover:text-accent-soft">
          {breakItem.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-6 text-muted">{breakItem.description}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">{lowestPrice}</span>
          <span className="font-medium text-accent-soft">{t("viewBreak")}</span>
        </div>
      </div>
    </Link>
  );
}
