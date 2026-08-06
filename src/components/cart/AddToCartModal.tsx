"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type AddToCartModalProps = {
  open: boolean;
  onClose: () => void;
  breakId: string;
};

export function AddToCartModal({ open, onClose, breakId }: AddToCartModalProps) {
  const t = useTranslations("cart.addModal");
  const router = useRouter();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label={t("close")}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-background p-6 shadow-2xl">
        <p className="text-lg font-semibold">{t("title")}</p>
        <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-3 text-sm font-medium transition hover:text-foreground"
          >
            {t("continueShopping")}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/cart");
            }}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
          >
            {t("goToCart")}
          </button>
        </div>
        <Link
          href={`/breaks/${breakId}`}
          className="mt-4 inline-flex text-xs text-muted hover:text-foreground"
          onClick={onClose}
        >
          {t("backToBreak")}
        </Link>
      </div>
    </div>
  );
}
