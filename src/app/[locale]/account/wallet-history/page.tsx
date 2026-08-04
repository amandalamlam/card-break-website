import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { WalletHistoryPanel } from "@/components/account/WalletHistoryPanel";
import { buildAuthRedirectPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { getDefaultMonthRange, getMonthOptions } from "@/lib/wallet/history";
import type { AppLocale } from "@/i18n/routing";

type WalletHistoryPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WalletHistoryPage({ params }: WalletHistoryPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();

  if (!user) {
    redirect({
      href: buildAuthRedirectPath(locale as AppLocale, `/${locale}/account/wallet-history`, "login"),
      locale: locale as AppLocale,
    });
    throw new Error("Auth required for wallet history.");
  }

  const t = await getTranslations("account.walletHistory");
  const monthOptions = getMonthOptions();
  const { startMonth, endMonth } = getDefaultMonthRange();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      <WalletHistoryPanel
        locale={locale}
        monthOptions={monthOptions}
        defaultStartMonth={startMonth}
        defaultEndMonth={endMonth}
      />
    </div>
  );
}
