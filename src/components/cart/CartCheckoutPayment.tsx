"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/breaks/format";
import { clampCreditAmount, roundMoney } from "@/lib/wallet/types";
import type { AppLocale } from "@/i18n/routing";

type CartCheckoutPaymentProps = {
  locale: AppLocale;
  totalAmount: number;
  availableCredit: number;
  onPaid?: () => void;
};

export function CartCheckoutPayment({
  locale,
  totalAmount,
  availableCredit,
}: CartCheckoutPaymentProps) {
  const t = useTranslations("checkout");
  const [creditInput, setCreditInput] = useState("0");
  const [useMaxCredit, setUseMaxCredit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxCredit = useMemo(
    () => roundMoney(clampCreditAmount(totalAmount, totalAmount, availableCredit)),
    [availableCredit, totalAmount]
  );

  const appliedCredit = useMemo(() => {
    if (useMaxCredit) {
      return maxCredit;
    }

    const parsed = Number.parseFloat(creditInput);
    if (Number.isNaN(parsed)) {
      return 0;
    }

    return roundMoney(clampCreditAmount(parsed, totalAmount, availableCredit));
  }, [creditInput, maxCredit, totalAmount, useMaxCredit, availableCredit]);

  const stripeAmount = roundMoney(Math.max(0, totalAmount - appliedCredit));
  const isCreditOnly = stripeAmount <= 0;

  async function handlePay() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          appliedCredit,
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
        const errorKey = data.error ?? "UNKNOWN";
        const knownErrors = [
          "INSUFFICIENT_CREDIT",
          "CREDIT_EXCEEDS_PRICE",
          "LOCK_EXPIRED",
          "SLOT_UNAVAILABLE",
          "CART_EMPTY",
          "CART_EXPIRED",
        ] as const;
        const message = knownErrors.includes(errorKey as (typeof knownErrors)[number])
          ? t(`paymentErrors.${errorKey as (typeof knownErrors)[number]}`)
          : t("payError");
        setError(message);
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
              disabled={loading || maxCredit <= 0}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-muted">
              {t("useMaxCredit", { amount: formatPrice(maxCredit) })}
            </span>
          </label>

          {!useMaxCredit ? (
            <div className="mt-3">
              <label className="text-xs uppercase tracking-[0.18em] text-muted" htmlFor="cartCreditAmount">
                {t("creditToApply")}
              </label>
              <input
                id="cartCreditAmount"
                type="number"
                min={0}
                max={maxCredit}
                step="0.01"
                value={creditInput}
                onChange={(event) => setCreditInput(event.target.value)}
                disabled={loading}
                className="input-no-spin mt-2 w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm outline-none focus:border-accent"
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

      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft disabled:opacity-60"
      >
        {loading
          ? t("payProcessing")
          : isCreditOnly
            ? t("payWithCredit")
            : appliedCredit > 0
              ? t("payMixed")
              : t("payButton", { amount: formatPrice(stripeAmount) })}
      </button>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <p className="text-xs text-muted">{isCreditOnly ? t("creditOnlyHint") : t("payHint")}</p>
    </div>
  );
}
