"use client";

import { Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { formatRemainingSeconds } from "@/lib/slots/time";

const URGENT_THRESHOLD_SECONDS = 120;

export function CartCountdownBanner() {
  const t = useTranslations("cart.banner");
  const { cart, remainingSeconds, expiredBannerVisible } = useCart();

  if (expiredBannerVisible) {
    return (
      <div className="cart-banner-expired w-full border-b border-rose-500/50 bg-[#2a0e12] px-4 py-2.5 text-center text-sm font-bold text-rose-300">
        {t("expired")}
      </div>
    );
  }

  if (!cart || cart.items.length === 0 || remainingSeconds === null || remainingSeconds <= 0) {
    return null;
  }

  const isUrgent = remainingSeconds <= URGENT_THRESHOLD_SECONDS;
  const timerDisplay = formatRemainingSeconds(remainingSeconds);

  return (
    <div
      className={`w-full px-4 py-2.5 transition-colors duration-500 ${
        isUrgent
          ? "border-b border-rose-500/50 bg-[#2a0e12]"
          : "border-b border-amber-500/30 bg-[#1c160c]"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 text-sm ${
          isUrgent ? "font-bold text-rose-300" : "font-semibold text-amber-400"
        }`}
      >
        <Timer
          className={`h-4 w-4 shrink-0 ${isUrgent ? "text-rose-400" : "text-amber-400"}`}
          aria-hidden
        />
        <span>
          {t("holdingPrefix")}
          <span
            className={`tabular-nums ${isUrgent ? "animate-pulse text-rose-200" : "text-amber-300"}`}
          >
            {timerDisplay}
          </span>
        </span>
        <Link
          href="/cart"
          className={`underline-offset-2 transition hover:underline ${
            isUrgent
              ? "text-rose-200 hover:text-rose-100"
              : "text-amber-200 hover:text-amber-100"
          }`}
        >
          {t("checkoutLink")}
        </Link>
      </div>
    </div>
  );
}
