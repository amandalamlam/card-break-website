import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { CartPageClient } from "@/components/cart/CartPageClient";
import { buildAuthRedirectPath } from "@/lib/auth/redirect";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { getActiveCart } from "@/lib/cart/actions";
import { handleCartCheckoutReturn } from "@/lib/cart/checkout-cancel";
import { parseWalletBalance } from "@/lib/wallet/types";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type CartPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cancelled?: string; order_id?: string; notice?: string }>;
};

export default async function CartPage({ params, searchParams }: CartPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = locale as AppLocale;

  const user = await getCurrentUser();
  if (!user) {
    redirect({
      href: buildAuthRedirectPath(appLocale, `/${locale}/cart`, "login"),
      locale: appLocale,
    });
  }

  const { cancelled, order_id: orderId, notice } = await searchParams;

  if (cancelled === "1" && orderId) {
    const result = await handleCartCheckoutReturn(orderId, user!.id);
    const nextNotice = result.notice ?? "cancelled";
    redirect({
      href: `/cart?notice=${nextNotice}`,
      locale: appLocale,
    });
  }

  const profile = await getCurrentProfile();
  const wallet = profile
    ? parseWalletBalance(profile)
    : { availableCredit: 0, storeCredit: 0, creditReserved: 0 };
  const cart = await getActiveCart(user!.id);
  const t = await getTranslations("cart");

  const cartNotice =
    notice === "cancelled" || notice === "expired" ? notice : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
      <Link
        href="/breaks"
        className="inline-flex text-sm text-muted transition hover:text-foreground"
      >
        {t("backToBreaks")}
      </Link>

      <div className="mt-6 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      <div className="mt-8">
        <CartPageClient
          locale={appLocale}
          initialCart={cart}
          availableCredit={wallet.availableCredit}
          notice={cartNotice}
        />
      </div>
    </div>
  );
}
