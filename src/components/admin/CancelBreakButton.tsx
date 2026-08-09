"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type CancelBreakButtonProps = {
  breakId: string;
  breakTitle: string;
};

export function CancelBreakButton({ breakId, breakTitle }: CancelBreakButtonProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    const confirmed = window.confirm(t("cancelBreakConfirm", { title: breakTitle }));
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/breaks/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakId }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        refundedOrders?: number;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        const errorCode = data.error ?? "UNKNOWN";
        const errorKey = `cancelBreakErrors.${errorCode}`;
        const translated = t(errorKey);
        setError(translated === errorKey ? t("cancelBreakError") : translated);
        setLoading(false);
        return;
      }

      setMessage(
        t("cancelBreakSuccess", {
          count: data.refundedOrders ?? 0,
        })
      );
      router.refresh();
    } catch {
      setError(t("cancelBreakError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-200 transition hover:border-red-400 hover:text-red-100 disabled:opacity-60"
      >
        {loading ? t("cancellingBreak") : t("cancelBreak")}
      </button>
      {message ? <p className="text-xs text-success">{message}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
