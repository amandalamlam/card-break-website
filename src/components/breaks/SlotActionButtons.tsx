"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AddToCartModal } from "@/components/cart/AddToCartModal";
import { CART_RPC_ERROR_I18N_KEYS } from "@/lib/cart/rpc-errors";
import {
  isSlotAvailableForBuyNow,
  isSlotAvailableForCart,
  isSlotLockedByUser,
} from "@/lib/slots/helpers";
import type { BreakSlot, BreakStatus } from "@/lib/breaks/types";

type SlotActionButtonsProps = {
  breakId: string;
  breakStatus: BreakStatus;
  slot: BreakSlot;
  currentUserId?: string | null;
  locale: string;
};

export function SlotActionButtons({
  breakId,
  breakStatus,
  slot,
  currentUserId = null,
  locale,
}: SlotActionButtonsProps) {
  const t = useTranslations("breaks");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const canBuyNow = isSlotAvailableForBuyNow(slot, breakStatus, currentUserId);
  const canAddToCart = isSlotAvailableForCart(slot, breakStatus, currentUserId);
  const isBuyNowResume =
    slot.lock_type === "buy_now" && isSlotLockedByUser(slot, currentUserId);

  const loginRedirect = `/auth/login?redirect=/${locale}/breaks/${breakId}`;

  async function handleAddToCart() {
    if (!currentUserId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakId, slotId: slot.id }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        const errorCode = data.error ?? "UNKNOWN";
        const errorKey = CART_RPC_ERROR_I18N_KEYS[errorCode];
        setError(errorKey ? t(errorKey) : t("addToCartError"));
        setLoading(false);
        return;
      }

      setShowModal(true);
    } catch {
      setError(t("addToCartError"));
    } finally {
      setLoading(false);
    }
  }

  if (!canBuyNow && !canAddToCart) {
    return (
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
    );
  }

  const buyNowHref = `/checkout/start?mode=buy_now&breakId=${breakId}&slotId=${slot.id}`;

  return (
    <div className="space-y-2">
      {canBuyNow ? (
        currentUserId ? (
          <Link
            href={buyNowHref}
            prefetch={false}
            className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
              isBuyNowResume
                ? "border border-accent/40 bg-accent/10 text-accent-soft hover:border-accent"
                : "bg-accent text-background hover:bg-accent-soft"
            }`}
          >
            {isBuyNowResume ? t("continueBuyNow") : t("buyNow")}
          </Link>
        ) : (
          <Link
            href={loginRedirect}
            className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
          >
            {t("buyNow")}
          </Link>
        )
      ) : null}

      {canAddToCart ? (
        currentUserId ? (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-foreground disabled:opacity-60"
          >
            {loading ? t("addingToCart") : t("addToCart")}
          </button>
        ) : (
          <Link
            href={loginRedirect}
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
          >
            {t("addToCart")}
          </Link>
        )
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <AddToCartModal open={showModal} onClose={() => setShowModal(false)} breakId={breakId} />
    </div>
  );
}
