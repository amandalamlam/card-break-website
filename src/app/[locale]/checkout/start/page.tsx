import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getBreakById, getSlotById } from "@/lib/breaks/queries";
import { formatPrice } from "@/lib/breaks/format";
import { buildAuthRedirectPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type CheckoutStartPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ breakId?: string; slotId?: string }>;
};

export default async function CheckoutStartPage({
  params,
  searchParams,
}: CheckoutStartPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { breakId, slotId } = await searchParams;

  if (!breakId || !slotId) {
    notFound();
  }

  const checkoutPath = `/${locale}/checkout/start?breakId=${breakId}&slotId=${slotId}`;

  const user = await getCurrentUser();
  if (!user) {
    redirect({
      href: buildAuthRedirectPath(locale as AppLocale, checkoutPath, "login"),
      locale: locale as AppLocale,
    });
  }

  const breakItem = await getBreakById(breakId);
  const slot = await getSlotById(slotId, breakId);

  if (!breakItem || !slot) {
    notFound();
  }

  const t = await getTranslations("checkout");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
      <div className="glass-panel rounded-3xl p-8">
        <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent-soft">
          {t("authenticatedBadge")}
        </span>
        <h1 className="mt-4 text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-3 text-sm leading-7 text-muted">{t("subtitle")}</p>

        <div className="mt-6 space-y-3 rounded-2xl border border-border bg-background/50 p-4 text-sm">
          <p>
            <span className="text-muted">{t("breakLabel")}: </span>
            <span className="font-medium">{breakItem.title}</span>
          </p>
          <p>
            <span className="text-muted">{t("slotLabel")}: </span>
            <span className="font-medium">{slot.name}</span>
          </p>
          <p>
            <span className="text-muted">{t("priceLabel")}: </span>
            <span className="font-semibold text-accent-soft">{formatPrice(Number(slot.price))}</span>
          </p>
        </div>

        <p className="mt-6 rounded-2xl border border-dashed border-accent/40 bg-accent/5 px-4 py-3 text-sm text-accent-soft">
          {t("phaseNote")}
        </p>
      </div>
    </div>
  );
}
