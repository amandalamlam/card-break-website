"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";

type CheckoutPayButtonProps = {
  breakId: string;
  slotId: string;
  locale: AppLocale;
  disabled?: boolean;
};

export function CheckoutPayButton({
  breakId,
  slotId,
  locale,
  disabled = false,
}: CheckoutPayButtonProps) {
  const t = useTranslations("checkout");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakId, slotId, locale }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? t("payError"));
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(t("payError"));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handlePay}
        disabled={disabled || loading}
        className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t("payProcessing") : t("payButton")}
      </button>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-muted">{t("payHint")}</p>
    </div>
  );
}
