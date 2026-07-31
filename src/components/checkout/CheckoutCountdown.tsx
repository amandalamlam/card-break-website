"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckoutPayButton } from "./CheckoutPayButton";
import type { AppLocale } from "@/i18n/routing";

type CheckoutCountdownProps = {
  expiresAt: string;
  slotId: string;
  breakId: string;
  locale: AppLocale;
};

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CheckoutCountdown({ expiresAt, slotId, breakId, locale }: CheckoutCountdownProps) {
  const t = useTranslations("checkout");
  const expiresAtMs = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
  );
  const [released, setReleased] = useState(false);

  useEffect(() => {
    const tick = () => {
      setRemainingSeconds(Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000)));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAtMs]);

  useEffect(() => {
    if (remainingSeconds > 0 || released) {
      return;
    }

    async function notifyExpired() {
      try {
        await fetch("/api/slots/release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotId }),
        });
      } finally {
        setReleased(true);
      }
    }

    void notifyExpired();
  }, [remainingSeconds, released, slotId]);

  const isExpired = remainingSeconds <= 0;
  const isUrgent = remainingSeconds > 0 && remainingSeconds <= 60;

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
          {isExpired ? "00:00" : formatRemaining(remainingSeconds)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {isExpired ? t("lockExpired") : t("lockActive")}
        </p>
      </div>

      {isExpired ? (
        <Link
          href={`/breaks/${breakId}`}
          className="inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
        >
          {t("backToBreak")}
        </Link>
      ) : (
        <CheckoutPayButton
          breakId={breakId}
          slotId={slotId}
          locale={locale}
          disabled={isExpired}
        />
      )}
    </div>
  );
}
