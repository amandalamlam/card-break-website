"use client";

import { useTranslations } from "next-intl";
import { SlotStatusBadgeClient } from "@/components/breaks/SlotStatusBadgeClient";
import { SlotActionButtons } from "@/components/breaks/SlotActionButtons";
import { formatPrice } from "@/lib/breaks/format";
import { useSlotPolling } from "@/hooks/useSlotPolling";
import type { BreakSlot, BreakStatus } from "@/lib/breaks/types";

type SlotGridLiveProps = {
  breakId: string;
  breakStatus: BreakStatus;
  initialSlots: BreakSlot[];
  currentUserId?: string | null;
  locale: string;
};

export function SlotGridLive({
  breakId,
  breakStatus,
  initialSlots,
  currentUserId = null,
  locale,
}: SlotGridLiveProps) {
  const t = useTranslations("breaks");
  const isLiveBreak = breakStatus === "active" || breakStatus === "sold_out";
  const { slots, isRefreshing, error } = useSlotPolling(breakId, initialSlots, isLiveBreak);

  if (slots.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        {t("noSlots")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isLiveBreak ? (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{isRefreshing ? t("liveUpdating") : t("liveConnected")}</span>
          {error ? <span className="text-red-300">{error}</span> : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <article
            key={slot.id}
            className="glass-panel flex flex-col justify-between rounded-2xl p-5"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{slot.name}</h3>
                <SlotStatusBadgeClient status={slot.status} />
              </div>
              <p className="text-2xl font-semibold text-accent-soft">
                {formatPrice(Number(slot.price))}
              </p>
            </div>

            <div className="mt-5">
              <SlotActionButtons
                breakId={breakId}
                breakStatus={breakStatus}
                slot={slot}
                currentUserId={currentUserId}
                locale={locale}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
