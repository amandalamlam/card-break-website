import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SlotStatusBadge } from "@/components/breaks/StatusBadge";
import { formatPrice } from "@/lib/breaks/format";
import { canUserCheckoutSlot, isSlotLockedByUser, normalizeSlotForDisplay } from "@/lib/slots/helpers";
import type { BreakSlot, BreakStatus } from "@/lib/breaks/types";

type SlotGridProps = {
  breakId: string;
  breakStatus: BreakStatus;
  slots: BreakSlot[];
  currentUserId?: string | null;
};

export async function SlotGrid({
  breakId,
  breakStatus,
  slots,
  currentUserId = null,
}: SlotGridProps) {
  const t = await getTranslations("breaks");

  if (slots.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        {t("noSlots")}
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {slots.map((rawSlot) => {
        const slot = normalizeSlotForDisplay(rawSlot);
        const canCheckout = canUserCheckoutSlot(slot, breakStatus, currentUserId);
        const isResume = isSlotLockedByUser(slot, currentUserId);
        const checkoutHref = `/checkout/start?breakId=${breakId}&slotId=${slot.id}`;

        return (
          <article
            key={slot.id}
            className="glass-panel flex flex-col justify-between rounded-2xl p-5"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{slot.name}</h3>
                <SlotStatusBadge status={slot.status} />
              </div>
              <p className="text-2xl font-semibold text-accent-soft">{formatPrice(Number(slot.price))}</p>
            </div>

            <div className="mt-5">
              {canCheckout ? (
                <Link
                  href={checkoutHref}
                  className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isResume
                      ? "border border-accent/40 bg-accent/10 text-accent-soft hover:border-accent hover:text-accent"
                      : "bg-accent text-background hover:bg-accent-soft"
                  }`}
                >
                  {isResume ? t("continueCheckout") : t("checkout")}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-border px-4 py-3 text-sm text-muted"
                >
                  {slot.status === "sold"
                    ? t("soldOutSlot")
                    : slot.status === "locked"
                      ? t("lockedSlot")
                      : t("unavailable")}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
