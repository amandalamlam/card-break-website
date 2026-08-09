"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ShippingOption } from "@/lib/shipping/types";
import type { CompletedBreakShipping } from "@/lib/shipping/types";

type ShippingRequestFormProps = {
  breakItem: CompletedBreakShipping;
  options: ShippingOption[];
};

export function ShippingRequestForm({ breakItem, options }: ShippingRequestFormProps) {
  const t = useTranslations("shipping");
  const router = useRouter();
  const [selectedOptionId, setSelectedOptionId] = useState<number | "">(
    options[0]?.id ?? ""
  );
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOption = options.find((option) => option.id === selectedOptionId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/shipping/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breakId: breakItem.breakId,
          shippingOptionId: selectedOptionId,
          shippingDetails: details,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        const code = data.error ?? "UNKNOWN";
        const known = [
          "SHIPPING_ALREADY_REQUESTED",
          "MISSING_SHIPPING_DETAILS",
          "INVALID_SHIPPING_OPTION",
          "BREAK_NOT_COMPLETED",
          "NO_PAID_SLOTS",
        ] as const;
        setError(
          known.includes(code as (typeof known)[number])
            ? t(`errors.${code as (typeof known)[number]}`)
            : t("errors.UNKNOWN")
        );
        setLoading(false);
        return;
      }

      router.push("/account");
      router.refresh();
    } catch {
      setError(t("errors.UNKNOWN"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-border bg-background/50 p-4 text-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("slotsWon")}</p>
        <p className="mt-2 font-medium">{breakItem.slotNames.join(", ")}</p>
      </div>

      {breakItem.videoUrl ? (
        <a
          href={breakItem.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-medium text-accent-soft transition hover:text-accent"
        >
          {t("watchReplay")} →
        </a>
      ) : null}

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.18em] text-muted" htmlFor="shippingOption">
          {t("optionLabel")}
        </label>
        <select
          id="shippingOption"
          value={selectedOptionId}
          onChange={(event) =>
            setSelectedOptionId(event.target.value ? Number(event.target.value) : "")
          }
          className="form-select w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm"
          required
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {selectedOption ? (
          <p className="text-sm text-muted">{selectedOption.instructions}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.18em] text-muted" htmlFor="shippingDetails">
          {t("detailsLabel")}
        </label>
        <textarea
          id="shippingDetails"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={5}
          required
          placeholder={t("detailsPlaceholder")}
          className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm outline-none focus:border-accent"
        />
        <p className="text-xs text-muted">{t("detailsHint")}</p>
      </div>

      <button
        type="submit"
        disabled={loading || !selectedOptionId}
        className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft disabled:opacity-60"
      >
        {loading ? t("submitting") : t("confirm")}
      </button>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <p className="text-xs text-muted">{t("noPaymentNote")}</p>
    </form>
  );
}
