"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";

type CartNavLinkProps = {
  variant?: "header" | "drawer";
  onNavigate?: () => void;
};

export function CartNavLink({ variant = "header", onNavigate }: CartNavLinkProps) {
  const t = useTranslations("nav");
  const { itemCount, badgePulse } = useCart();

  if (variant === "drawer") {
    return (
      <Link
        href="/cart"
        onClick={onNavigate}
        className="flex items-center justify-between rounded-xl px-3 py-3 text-base text-foreground/90 transition hover:bg-slate-900 hover:text-foreground"
      >
        <span>{t("cart")}</span>
        {itemCount > 0 ? (
          <span
            className={`inline-flex min-w-6 items-center justify-center rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-soft ${
              badgePulse ? "cart-badge-pulse" : ""
            }`}
          >
            {itemCount}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link href="/cart" className="inline-flex items-center gap-1 transition hover:text-foreground">
      <span>{t("cart")}</span>
      {itemCount > 0 ? (
        <span
          className={`inline-flex min-w-5 items-center justify-center rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-semibold text-accent-soft ${
            badgePulse ? "cart-badge-pulse" : ""
          }`}
        >
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
