import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminWithdrawalActions } from "@/components/admin/AdminWithdrawalActions";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatPrice } from "@/lib/breaks/format";
import { getWithdrawalsForAdmin } from "@/lib/wallet/withdrawal-actions";
import type { AppLocale } from "@/i18n/routing";

function formatAdminDate(createdAt: string, locale: string): string {
  return new Date(createdAt)
    .toLocaleString(locale, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ");
}

export default async function AdminWithdrawalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale as AppLocale);

  const t = await getTranslations("admin.withdrawals");
  const withdrawals = await getWithdrawalsForAdmin();
  const pending = withdrawals.filter((item) => item.status === "pending");
  const processed = withdrawals.filter((item) => item.status !== "pending");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted">{t("subtitle")}</p>
        </div>
        <Link
          href="/admin/breaks"
          className="rounded-xl border border-border px-5 py-3 text-sm text-muted transition hover:text-foreground"
        >
          {t("backToBreaks")}
        </Link>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t("pendingTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("pendingSubtitle")}</p>
        </div>

        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted">
            {t("noPending")}
          </p>
        ) : (
          <div className="space-y-4">
            {pending.map((withdrawal) => (
              <article
                key={withdrawal.id}
                className="glass-panel flex flex-col gap-4 rounded-2xl p-5 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="space-y-2 text-sm">
                  <p className="text-2xl font-semibold text-accent-soft">
                    {formatPrice(withdrawal.amount)}
                  </p>
                  <p>
                    <span className="text-muted">{t("userLabel")}: </span>
                    <span className="font-medium">
                      {withdrawal.profiles?.email ?? "—"} ({withdrawal.profiles?.phone ?? "—"})
                    </span>
                  </p>
                  <p>
                    <span className="text-muted">{t("methodLabel")}: </span>
                    <span className="font-medium">{t(`methods.${withdrawal.method}`)}</span>
                  </p>
                  <p>
                    <span className="text-muted">{t("detailsLabel")}: </span>
                    <span className="font-medium">{withdrawal.details}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {formatAdminDate(withdrawal.created_at, locale)}
                  </p>
                </div>

                <AdminWithdrawalActions
                  withdrawalId={withdrawal.id}
                  amountLabel={formatPrice(withdrawal.amount)}
                />
              </article>
            ))}
          </div>
        )}
      </section>

      {processed.length > 0 ? (
        <section className="mt-10 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{t("recentTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("recentSubtitle")}</p>
          </div>

          <div className="space-y-3">
            {processed.map((withdrawal) => (
              <article
                key={withdrawal.id}
                className="rounded-2xl border border-border bg-background/50 p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold">{formatPrice(withdrawal.amount)}</p>
                    <p className="text-muted">
                      {withdrawal.profiles?.email ?? "—"} · {t(`methods.${withdrawal.method}`)} ·{" "}
                      {t(`status.${withdrawal.status}`)}
                    </p>
                    <p className="text-muted">{withdrawal.details}</p>
                  </div>
                  <p className="text-xs text-muted">
                    {formatAdminDate(withdrawal.created_at, locale)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
