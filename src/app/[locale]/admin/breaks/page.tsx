import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BreakStatusBadge } from "@/components/breaks/StatusBadge";
import { CancelBreakButton } from "@/components/admin/CancelBreakButton";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAllBreaksForAdmin } from "@/lib/breaks/queries";
import type { AppLocale } from "@/i18n/routing";

export default async function AdminBreaksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale as AppLocale);

  const t = await getTranslations("admin");
  const breaks = await getAllBreaksForAdmin();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t("dashboardTitle")}</h1>
          <p className="text-muted">{t("dashboardSubtitle")}</p>
        </div>
        <Link
          href="/admin/breaks/new"
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
        >
          {t("createBreak")}
        </Link>
        <Link
          href="/admin/withdrawals"
          className="rounded-xl border border-border px-5 py-3 text-sm text-muted transition hover:text-foreground"
        >
          {t("manageWithdrawals")}
        </Link>
      </div>

      <div className="space-y-4">
        {breaks.map((breakItem) => (
          <article
            key={breakItem.id}
            className="glass-panel flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{breakItem.title}</h2>
                <BreakStatusBadge status={breakItem.status} />
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
              {breakItem.status === "active" || breakItem.status === "sold_out" ? (
                <CancelBreakButton breakId={breakItem.id} breakTitle={breakItem.title} />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
