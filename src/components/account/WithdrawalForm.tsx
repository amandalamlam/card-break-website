"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/breaks/format";
import { clampCreditAmount, roundMoney } from "@/lib/wallet/types";
import type { WithdrawalMethod } from "@/lib/wallet/withdrawals";

type WithdrawalFormProps = {
  availableCredit: number;
  disabled?: boolean;
};

const METHODS: WithdrawalMethod[] = ["FPS", "PayMe", "PayPal"];

export function WithdrawalForm({ availableCredit, disabled = false }: WithdrawalFormProps) {
  const t = useTranslations("account.withdrawals");
  const router = useRouter();
  const [amountInput, setAmountInput] = useState("");
  const [useMaxAmount, setUseMaxAmount] = useState(false);
  const [method, setMethod] = useState<WithdrawalMethod>("FPS");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const amount = useMemo(() => {
    if (useMaxAmount) {
      return roundMoney(Math.max(availableCredit, 0));
    }

    const parsed = Number.parseFloat(amountInput);
    if (Number.isNaN(parsed)) {
      return 0;
    }

    return roundMoney(clampCreditAmount(parsed, availableCredit, availableCredit));
  }, [amountInput, availableCredit, useMaxAmount]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/withdrawal/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method, details }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        const errorCode = data.error ?? "UNKNOWN";
        const knownErrors = [
          "INSUFFICIENT_CREDIT",
          "INVALID_AMOUNT",
          "MISSING_DETAILS",
          "INVALID_METHOD",
          "RATE_LIMIT",
        ] as const;

        setError(
          knownErrors.includes(errorCode as (typeof knownErrors)[number])
            ? t(`errors.${errorCode as (typeof knownErrors)[number]}`)
            : t("errors.UNKNOWN")
        );
        setLoading(false);
        return;
      }

      setSuccess(t("submitSuccess"));
      setAmountInput("");
      setUseMaxAmount(false);
      setDetails("");
      router.refresh();
    } catch {
      setError(t("errors.UNKNOWN"));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = availableCredit > 0 && amount > 0 && details.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-muted">{t("amountLabel")}</label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={useMaxAmount ? amount.toFixed(2) : amountInput}
            onChange={(event) => {
              setUseMaxAmount(false);
              setAmountInput(event.target.value);
            }}
            disabled={disabled || loading || useMaxAmount}
            className="w-full max-w-xs rounded-xl border border-border bg-background/50 px-4 py-3 text-sm outline-none transition focus:border-accent/50 md:w-auto"
            placeholder="0.00"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={useMaxAmount}
              onChange={(event) => setUseMaxAmount(event.target.checked)}
              disabled={disabled || loading || availableCredit <= 0}
            />
            {t("useMaxAmount", { amount: formatPrice(availableCredit) })}
          </label>
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-muted">{t("methodLabel")}</label>
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value as WithdrawalMethod)}
          disabled={disabled || loading}
          className="mt-2 w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm outline-none transition focus:border-accent/50 md:max-w-xs"
        >
          {METHODS.map((option) => (
            <option key={option} value={option}>
              {t(`methods.${option}`)}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted">{t(`methodHints.${method}`)}</p>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-muted">{t("detailsLabel")}</label>
        <input
          type="text"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          disabled={disabled || loading}
          className="mt-2 w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm outline-none transition focus:border-accent/50"
          placeholder={t(`detailsPlaceholders.${method}`)}
        />
      </div>

      <button
        type="submit"
        disabled={disabled || loading || !canSubmit}
        className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t("submitting") : t("submit")}
      </button>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-success">{success}</p> : null}
    </form>
  );
}
