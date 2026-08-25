import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  AccountPageTabs,
  type AccountTabId,
} from "@/components/account/AccountPageTabs";
import { buildAuthRedirectPath } from "@/lib/auth/redirect";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { getUserCompletedBreaksForShipping } from "@/lib/shipping/actions";
import { getDefaultMonthRange, getMonthOptions } from "@/lib/wallet/history";
import { parseWalletBalance } from "@/lib/wallet/types";
import type { AppLocale } from "@/i18n/routing";

const VALID_TABS = new Set<AccountTabId>(["overview", "shipping", "wallet"]);

function parseAccountTab(tab: string | undefined): AccountTabId {
  if (tab && VALID_TABS.has(tab as AccountTabId)) {
    return tab as AccountTabId;
  }

  return "overview";
}

type AccountPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AccountPage({ params, searchParams }: AccountPageProps) {
  const { locale } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile) {
    redirect({
      href: buildAuthRedirectPath(locale as AppLocale, `/${locale}/account`, "login"),
      locale: locale as AppLocale,
    });
    throw new Error("Profile missing after auth redirect.");
  }

  const { email, phone, role } = profile;
  const wallet = parseWalletBalance(profile);
  const activeTab = parseAccountTab(tab);

  let completedBreaks: Awaited<ReturnType<typeof getUserCompletedBreaksForShipping>> = [];
  let pendingShippingCount = 0;

  if (activeTab === "shipping") {
    completedBreaks = await getUserCompletedBreaksForShipping(user.id);
    pendingShippingCount = completedBreaks.filter((item) => !item.shippingRequest).length;
  }

  const t = await getTranslations("account");
  const monthOptions = getMonthOptions();
  const { startMonth, endMonth } = getDefaultMonthRange();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      <AccountPageTabs
        defaultTab={activeTab}
        locale={locale}
        email={email}
        phone={phone}
        role={role}
        availableCredit={wallet.availableCredit}
        creditReserved={wallet.creditReserved}
        completedBreaks={completedBreaks}
        pendingShippingCount={pendingShippingCount}
        monthOptions={monthOptions}
        defaultStartMonth={startMonth}
        defaultEndMonth={endMonth}
      />
    </div>
  );
}
