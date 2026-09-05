"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/breaks/format";
import { CartCheckoutPayment } from "@/components/cart/CartCheckoutPayment";
import { useCart } from "@/context/CartContext";
import {
  computeCartTotalAmount,
  normalizeCartWithItems,
  removeItemFromCart,
} from "@/lib/cart/normalize";
import { formatRemainingSeconds, getCartRemainingSeconds } from "@/lib/slots/time";
import type { CartWithItems } from "@/lib/cart/types";
import type { AppLocale } from "@/i18n/routing";

type CartPageClientProps = {
  locale: AppLocale;
  initialCart: CartWithItems | null;
  availableCredit: number;
  notice?: "cancelled" | "expired" | null;
};

export function CartPageClient({
  locale,
  initialCart,
  availableCredit,
  notice = null,
}: CartPageClientProps) {
  const t = useTranslations("cart");
  const { cart: contextCart, applyCart, refreshCart, remainingSeconds: contextRemainingSeconds } =
    useCart();
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState<number | null>(
    initialCart ? initialCart.remainingSeconds : null
  );
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(() => new Set());

  const cart = useMemo(() => {
    const source = normalizeCartWithItems(contextCart ?? initialCart);
    if (!source) {
      return null;
    }

    const items = source.items.filter((item) => !excludedItemIds.has(item.id));
    return normalizeCartWithItems({ ...source, items });
  }, [contextCart, excludedItemIds, initialCart]);

  const totalAmount = useMemo(
    () => (cart ? computeCartTotalAmount(cart.items) : 0),
    [cart]
  );

  const remainingSeconds =
    contextCart != null ? contextRemainingSeconds : localRemainingSeconds;

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    if (!contextCart) {
      return;
    }

    setExcludedItemIds((previous) => {
      const next = new Set<string>();
      for (const itemId of previous) {
        if (contextCart.items.some((item) => item.id === itemId)) {
          next.add(itemId);
        }
      }

      if (next.size === previous.size && [...next].every((id) => previous.has(id))) {
        return previous;
      }

      return next;
    });
  }, [contextCart]);

  useEffect(() => {
    if (contextCart != null || !cart?.expires_at) {
      return;
    }

    const tick = () => setLocalRemainingSeconds(getCartRemainingSeconds(cart.expires_at));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [cart?.expires_at, contextCart]);

  async function handleRemove(itemId: string) {
    const snapshot = contextCart ?? initialCart;
    setRemovingId(itemId);
    setRemoveError(null);
    setExcludedItemIds((previous) => {
      const next = new Set(previous);
      next.add(itemId);
      return next;
    });

    if (snapshot) {
      applyCart(removeItemFromCart(snapshot, itemId));
    }

    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok?: boolean;
        cart?: CartWithItems | null;
        error?: string;
      };

      if (response.ok) {
        applyCart(data.cart ?? null);
        return;
      }

      if (data.error === "CART_ITEM_NOT_FOUND") {
        await refreshCart();
        return;
      }

      if (snapshot) {
        applyCart(snapshot);
      }
      setExcludedItemIds((previous) => {
        const next = new Set(previous);
        next.delete(itemId);
        return next;
      });
      setRemoveError(t("removeError"));
    } catch {
      if (snapshot) {
        applyCart(snapshot);
      }
      setExcludedItemIds((previous) => {
        const next = new Set(previous);
        next.delete(itemId);
        return next;
      });
      setRemoveError(t("removeError"));
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCheckoutRefresh() {
    await refreshCart();
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="space-y-4">
        {notice === "cancelled" ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100/90">
            {t("cancelNotice")}
          </div>
        ) : null}
        {notice === "expired" ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200/90">
            {t("expiredNotice")}
          </div>
        ) : null}
        <div className="glass-panel rounded-3xl p-8 text-center">
          <p className="text-muted">{t("empty")}</p>
          <Link
            href="/breaks"
            className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background"
          >
            {t("browseBreaks")}
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = remainingSeconds !== null && remainingSeconds <= 0;
  const timerDisplay =
    remainingSeconds === null
      ? "--:--"
      : isExpired
        ? "00:00"
        : formatRemainingSeconds(remainingSeconds);

  return (
    <div className="space-y-6">
      {notice === "cancelled" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100/90">
          {t("cancelNotice")}
        </div>
      ) : null}
      {notice === "expired" ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200/90">
          {t("expiredNotice")}
        </div>
      ) : null}

      <div
        className={`rounded-2xl border px-5 py-4 ${
          isExpired ? "border-red-500/30 bg-red-500/10" : "border-accent/50 bg-accent/10"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("timerLabel")}</p>
        <p className="mt-2 font-mono text-3xl font-semibold text-accent-soft">{timerDisplay}</p>
        <p className="mt-2 text-sm text-muted">{isExpired ? t("timerExpired") : t("timerActive")}</p>
      </div>

      {removeError ? <p className="text-sm text-red-300">{removeError}</p> : null}

      <div className="space-y-3">
        {cart.items.map((item) => (
          <article
            key={item.id}
            className="glass-panel flex items-start justify-between gap-4 rounded-2xl p-4"
          >
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{item.break_title}</p>
              <p className="text-muted">{item.position_name}</p>
              <p className="font-medium text-accent-soft">{formatPrice(Number(item.price))}</p>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              disabled={removingId === item.id || isExpired}
              className="rounded-lg border border-border px-3 py-2 text-xs text-muted transition hover:text-red-300 disabled:opacity-50"
              aria-label={t("removeItem")}
            >
              {removingId === item.id ? "…" : "✕"}
            </button>
          </article>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-4 text-sm">
        <div className="flex justify-between font-semibold">
          <span>{t("total")}</span>
          <span className="text-accent-soft">{formatPrice(totalAmount)}</span>
        </div>
      </div>

      <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
        {t("paymentWarning")}
      </p>

      {!isExpired ? (
        <CartCheckoutPayment
          key={totalAmount}
          locale={locale}
          totalAmount={totalAmount}
          availableCredit={availableCredit}
          onPaid={handleCheckoutRefresh}
        />
      ) : (
        <Link
          href="/breaks"
          className="inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background"
        >
          {t("backToBreaks")}
        </Link>
      )}
    </div>
  );
}
