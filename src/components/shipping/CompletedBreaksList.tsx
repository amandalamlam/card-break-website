import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { CompletedBreakShipping } from "@/lib/shipping/types";

type CompletedBreaksListProps = {
  breaks: CompletedBreakShipping[];
};

export async function CompletedBreaksList({ breaks }: CompletedBreaksListProps) {
  const t = await getTranslations("shipping");

  if (breaks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted">
        {t("noCompletedBreaks")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {breaks.map((item) => (
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
              <p className="text-xs text-success">
                {t("statusSubmitted", {
                  option: item.shippingRequest.option_name,
                })}
              </p>
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
  );
}
