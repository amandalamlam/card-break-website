"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/breaks/format";
import type { Withdrawal } from "@/lib/wallet/withdrawals";

type WithdrawalHistoryProps = {
  withdrawals: Withdrawal[];
  locale: string;
  noWithdrawals: string;
};

function formatWithdrawalDate(createdAt: string, locale: string): string {
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

export function WithdrawalHistory({ withdrawals, locale, noWithdrawals }: WithdrawalHistoryProps) {
  const t = useTranslations("account.withdrawals");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(withdrawalId: number) {
    const confirmed = window.confirm(t("cancelConfirm"));
    if (!confirmed) {
      return;
    }

    setLoadingId(withdrawalId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/withdrawal/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setError(t("cancelError"));
        setLoadingId(null);
        return;
      }

      setMessage(t("cancelSuccess"));
      router.refresh();
    } catch {
      setError(t("cancelError"));
    } finally {
      setLoadingId(null);
    }
  }

  if (withdrawals.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted">
        {noWithdrawals}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {withdrawals.map((withdrawal) => (
        <article
          key={withdrawal.id}
          className="rounded-2xl border border-border bg-background/50 p-4 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold text-accent-soft">{formatPrice(withdrawal.amount)}</p>
              <p className="text-muted">
                {t(`methods.${withdrawal.method}`)} · {t(`status.${withdrawal.status}`)}
              </p>
              <p className="text-muted">{withdrawal.details}</p>
              <p className="text-xs text-muted">{formatWithdrawalDate(withdrawal.created_at, locale)}</p>
            </div>

            {withdrawal.status === "pending" ? (
              <button
                type="button"
                onClick={() => handleCancel(withdrawal.id)}
                disabled={loadingId === withdrawal.id}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted transition hover:text-foreground disabled:opacity-60"
              >
                {loadingId === withdrawal.id ? t("cancelling") : t("cancel")}
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
