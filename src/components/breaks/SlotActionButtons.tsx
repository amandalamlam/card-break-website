"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { dispatchCartUpdated, useCart } from "@/context/CartContext";
import { buildAuthRedirectPath } from "@/lib/auth/redirect";
import { cartApiUrl } from "@/lib/cart/client-api";
import { CART_RPC_ERROR_I18N_KEYS } from "@/lib/cart/rpc-errors";
import type { AppLocale } from "@/i18n/routing";
import {
  canAddSlotToCart,
  isSlotAvailableForBuyNow,
  isSlotInUserCart,
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
  const { showToast } = useToast();
  const { cartSlotIds, refreshCart, triggerBadgePulse } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canBuyNow = isSlotAvailableForBuyNow(slot, breakStatus, currentUserId);
  const canAddToCart = canAddSlotToCart(slot, breakStatus, currentUserId);
  const inCart =
    isSlotInUserCart(slot, currentUserId) || cartSlotIds.has(slot.id);
  const isBuyNowResume =
    slot.lock_type === "buy_now" && isSlotLockedByUser(slot, currentUserId);

  const breakPagePath = `/${locale}/breaks/${breakId}`;
  const loginRedirect = buildAuthRedirectPath(locale as AppLocale, breakPagePath, "login");

  async function handleAddToCart() {
    if (!currentUserId) {
      return;
    }

    if (inCart) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(cartApiUrl("/api/cart/items"), {
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

      await refreshCart();
      triggerBadgePulse();
      dispatchCartUpdated();
      showToast(t("addToCartSuccess", { slotName: slot.name }));
    } catch {
      setError(t("addToCartError"));
    } finally {
      setLoading(false);
    }
  }

  if (!canBuyNow && !canAddToCart && !inCart) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-border px-4 py-3 text-sm text-muted"
      >
        {breakStatus === "completed"
          ? t("completedSlot")
          : breakStatus === "cancelled"
            ? t("cancelledSlot")
            : slot.status === "sold"
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
            prefetch={false}
            className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
          >
            {t("buyNow")}
          </Link>
        )
      ) : null}

      {inCart ? (
        <button
          type="button"
          disabled
          className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-slate-400 opacity-50"
        >
          {t("alreadyInCart")}
        </button>
      ) : canAddToCart ? (
        currentUserId ? (
          <LoadingButton
            type="button"
            onClick={handleAddToCart}
            loading={loading}
            loadingText={t("addingToCart")}
            className="inline-flex w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-foreground disabled:opacity-60"
          >
            {t("addToCart")}
          </LoadingButton>
        ) : (
          <Link
            href={loginRedirect}
            prefetch={false}
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
          >
            {t("addToCart")}
          </Link>
        )
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
