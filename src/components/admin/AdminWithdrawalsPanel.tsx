"use client";

import { useTranslations } from "next-intl";
import { AdminWithdrawalActions } from "@/components/admin/AdminWithdrawalActions";
import { formatPrice } from "@/lib/breaks/format";
import type { WithdrawalWithProfile } from "@/lib/wallet/withdrawals";

type AdminWithdrawalsPanelProps = {
  withdrawals: WithdrawalWithProfile[];
  locale: string;
};

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

export function AdminWithdrawalsPanel({ withdrawals, locale }: AdminWithdrawalsPanelProps) {
  const t = useTranslations("admin.withdrawals");
  const pending = withdrawals.filter((item) => item.status === "pending");
  const processed = withdrawals.filter((item) => item.status !== "pending");

  return (
    <div className="space-y-8">
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
          <div className="space-y-3">
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
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{t("recentTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("recentSubtitle")}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/40">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/70 text-sm">
                <thead className="bg-background/60">
                  <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted">
                    <th className="px-4 py-3 font-medium">{t("table.amount")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.user")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.method")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {processed.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-background/30">
                      <td className="px-4 py-3 font-semibold text-accent-soft">
                        {formatPrice(withdrawal.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{withdrawal.profiles?.email ?? "—"}</p>
                        <p className="text-xs text-muted">{withdrawal.profiles?.phone ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted">{t(`methods.${withdrawal.method}`)}</td>
                      <td className="px-4 py-3">{t(`status.${withdrawal.status}`)}</td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {formatAdminDate(withdrawal.created_at, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
