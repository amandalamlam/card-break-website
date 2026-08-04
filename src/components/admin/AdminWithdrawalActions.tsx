"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type AdminWithdrawalActionsProps = {
  withdrawalId: number;
  amountLabel: string;
};

export function AdminWithdrawalActions({
  withdrawalId,
  amountLabel,
}: AdminWithdrawalActionsProps) {
  const t = useTranslations("admin.withdrawals");
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"complete" | "reject" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    const confirmed = window.confirm(t("completeConfirm", { amount: amountLabel }));
    if (!confirmed) {
      return;
    }

    setLoadingAction("complete");
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/withdrawals/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setError(t("actionError"));
        setLoadingAction(null);
        return;
      }

      setMessage(t("completeSuccess"));
      router.refresh();
    } catch {
      setError(t("actionError"));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReject() {
    const confirmed = window.confirm(t("rejectConfirm", { amount: amountLabel }));
    if (!confirmed) {
      return;
    }

    setLoadingAction("reject");
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/withdrawals/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setError(t("actionError"));
        setLoadingAction(null);
        return;
      }

      setMessage(t("rejectSuccess"));
      router.refresh();
    } catch {
      setError(t("actionError"));
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleComplete}
          disabled={loadingAction !== null}
          className="rounded-lg bg-success/20 px-4 py-2 text-sm text-success transition hover:bg-success/30 disabled:opacity-60"
        >
          {loadingAction === "complete" ? t("completing") : t("complete")}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={loadingAction !== null}
          className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-200 transition hover:border-red-400 hover:text-red-100 disabled:opacity-60"
        >
          {loadingAction === "reject" ? t("rejecting") : t("reject")}
        </button>
      </div>
      {message ? <p className="text-xs text-success">{message}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
