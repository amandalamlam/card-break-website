"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/breaks/format";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { clampCreditAmount, roundMoney } from "@/lib/wallet/types";
import type { AppLocale } from "@/i18n/routing";

type CheckoutPaymentProps = {
  breakId: string;
  slotId: string;
  locale: AppLocale;
  slotPrice: number;
  availableCredit: number;
  disabled?: boolean;
};

export function CheckoutPayment({
  breakId,
  slotId,
  locale,
  slotPrice,
  availableCredit,
  disabled = false,
}: CheckoutPaymentProps) {
  const t = useTranslations("checkout");
  const [creditInput, setCreditInput] = useState("0");
  const [useMaxCredit, setUseMaxCredit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxCredit = useMemo(
    () => clampCreditAmount(slotPrice, slotPrice, availableCredit),
    [availableCredit, slotPrice]
  );

  const appliedCredit = useMemo(() => {
    if (useMaxCredit) {
      return maxCredit;
    }

    const parsed = Number.parseFloat(creditInput);
    if (Number.isNaN(parsed)) {
      return 0;
    }

    return roundMoney(clampCreditAmount(parsed, slotPrice, availableCredit));
  }, [creditInput, maxCredit, slotPrice, useMaxCredit, availableCredit]);

  const stripeAmount = roundMoney(slotPrice - appliedCredit);
  const isCreditOnly = stripeAmount <= 0;

  async function handlePay() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breakId,
          slotId,
          locale,
          creditAmount: appliedCredit,
        }),
      });

      const data = (await response.json()) as {
        type?: "credit" | "stripe";
        url?: string;
        successUrl?: string;
        error?: string;
      };

      if (!response.ok) {
        const errorCode = data.error ?? "UNKNOWN";
        const knownErrors = ["INSUFFICIENT_CREDIT", "CREDIT_EXCEEDS_PRICE", "LOCK_EXPIRED", "SLOT_UNAVAILABLE"] as const;
        setError(
          knownErrors.includes(errorCode as (typeof knownErrors)[number])
            ? t(`paymentErrors.${errorCode as (typeof knownErrors)[number]}`)
            : t("payError")
        );
        setLoading(false);
        return;
      }

      if (data.type === "credit" && data.successUrl) {
        window.location.assign(data.successUrl);
        return;
      }

      if (data.type === "stripe" && data.url) {
        window.location.assign(data.url);
        return;
      }

      setError(t("payError"));
      setLoading(false);
    } catch {
      setError(t("payError"));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {availableCredit > 0 ? (
        <div className="rounded-2xl border border-border bg-background/50 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted">{t("walletAvailable")}</p>
            <p className="font-semibold text-accent-soft">{formatPrice(availableCredit)}</p>
          </div>

          <label className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={useMaxCredit}
              onChange={(event) => setUseMaxCredit(event.target.checked)}
              disabled={disabled || loading || maxCredit <= 0}
              className="h-4 w-4 rounded border-border"
            />
            <span>{t("useMaxCredit")}</span>
          </label>

          {!useMaxCredit ? (
            <div className="mt-3">
              <label className="text-xs uppercase tracking-[0.18em] text-muted" htmlFor="creditAmount">
                {t("creditToApply")}
              </label>
              <input
                id="creditAmount"
                type="number"
                min={0}
                max={maxCredit}
                step="0.01"
                value={creditInput}
                onChange={(event) => setCreditInput(event.target.value)}
                disabled={disabled || loading}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </div>
          ) : null}

          <div className="mt-4 space-y-2 border-t border-border/70 pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted">{t("creditApplied")}</span>
              <span>{formatPrice(appliedCredit)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">{t("stripeDue")}</span>
              <span className="font-semibold">{formatPrice(stripeAmount)}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          {t("noWalletCredit")}
        </p>
      )}

      <LoadingButton
        type="button"
        onClick={handlePay}
        loading={loading}
        loadingText={t("payProcessing")}
        disabled={disabled}
        className="inline-flex w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCreditOnly
          ? t("payWithCredit")
          : appliedCredit > 0
            ? t("payMixed")
            : t("payButton")}
      </LoadingButton>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-muted">
        {isCreditOnly ? t("creditOnlyHint") : t("payHint")}
      </p>
    </div>
  );
}
