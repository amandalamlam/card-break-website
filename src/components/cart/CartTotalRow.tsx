"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/breaks/format";
import { computeCartTotalAmount } from "@/lib/cart/normalize";
import type { CartItem } from "@/lib/cart/types";

type CartTotalRowProps = {
  items: CartItem[];
};

export function CartTotalRow({ items }: CartTotalRowProps) {
  const t = useTranslations("cart");
  const totalAmount = computeCartTotalAmount(items);

  return (
    <div className="glass-panel rounded-2xl p-4 text-sm">
      <div className="flex justify-between font-semibold">
        <span>{t("total")}</span>
        <span className="text-accent-soft" data-cart-item-count={items.length}>
          {formatPrice(totalAmount)}
        </span>
      </div>
    </div>
  );
}
