"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckoutPayment } from "./CheckoutPayment";
import { getLockRemainingSeconds } from "@/lib/slots/time";
import type { AppLocale } from "@/i18n/routing";

type CheckoutCountdownProps = {
  lockedAt: string;
  slotId: string;
  breakId: string;
  locale: AppLocale;
  slotPrice: number;
  availableCredit: number;
};

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CheckoutCountdown({
  lockedAt,
  slotId,
  breakId,
  locale,
  slotPrice,
  availableCredit,
}: CheckoutCountdownProps) {
  const t = useTranslations("checkout");
  // null = not yet synced on client (avoids SSR/hydration mismatch + false expiry)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [released, setReleased] = useState(false);

  useEffect(() => {
    const tick = () => {
      setRemainingSeconds(getLockRemainingSeconds(lockedAt));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [lockedAt]);

  useEffect(() => {
    // Only release after the client has synced the real remaining time and it hit zero.
    if (remainingSeconds === null || remainingSeconds > 0 || released) {
      return;
    }

    async function notifyExpired() {
      try {
        // Lazy-release expired locks only — do NOT force-release via /api/slots/release
        // (that endpoint clears the caller's lock even when still active).
        await fetch(`/api/slots?breakId=${breakId}`, { cache: "no-store" });
      } finally {
        setReleased(true);
      }
    }

    void notifyExpired();
  }, [remainingSeconds, released, breakId]);

  const mounted = remainingSeconds !== null;
  const isExpired = mounted && remainingSeconds <= 0;
  const isUrgent = mounted && remainingSeconds > 0 && remainingSeconds <= 60;
  const timerDisplay = !mounted
    ? "--:--"
    : isExpired
      ? "00:00"
      : formatRemaining(remainingSeconds);

  return (
    <div className="mt-6 space-y-4">
      <div
        className={`rounded-2xl border px-5 py-4 ${
          isExpired
            ? "border-red-500/30 bg-red-500/10"
            : isUrgent
              ? "border-accent/50 bg-accent/10"
              : "border-success/30 bg-success/10"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("lockTimerLabel")}</p>
        <p
          className={`mt-2 font-mono text-4xl font-semibold ${
            isExpired ? "text-red-200" : isUrgent ? "text-accent-soft" : "text-success"
          }`}
        >
          {timerDisplay}
        </p>
        <p className="mt-2 text-sm text-muted">
          {!mounted ? t("lockActive") : isExpired ? t("lockExpired") : t("lockActive")}
        </p>
      </div>

      {!mounted ? (
        <CheckoutPayment
          breakId={breakId}
          slotId={slotId}
          locale={locale}
          slotPrice={slotPrice}
          availableCredit={availableCredit}
          disabled
        />
      ) : isExpired ? (
        <Link
          href={`/breaks/${breakId}`}
          className="inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
        >
          {t("backToBreak")}
        </Link>
      ) : (
        <CheckoutPayment
          breakId={breakId}
          slotId={slotId}
          locale={locale}
          slotPrice={slotPrice}
          availableCredit={availableCredit}
          disabled={isExpired}
        />
      )}
    </div>
  );
}
