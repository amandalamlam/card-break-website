import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AdminDashboardTabs,
  type AdminTabId,
} from "@/components/admin/AdminDashboardTabs";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAllBreaksWithSlotsForAdmin } from "@/lib/breaks/queries";
import { getAdminShippingDisplayStatus } from "@/lib/shipping/admin-display";
import { getAdminShippingBreakOverview } from "@/lib/shipping/actions";
import { getWithdrawalsForAdmin } from "@/lib/wallet/withdrawal-actions";
import type { AppLocale } from "@/i18n/routing";

const VALID_TABS = new Set<AdminTabId>(["breaks", "withdrawals", "shipping"]);

function parseAdminTab(tab: string | undefined): AdminTabId {
  if (tab && VALID_TABS.has(tab as AdminTabId)) {
    return tab as AdminTabId;
  }

  return "breaks";
}

type AdminPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { locale } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);
  await requireAdmin(locale as AppLocale);

  const [breaks, withdrawals, shippingBreaks] = await Promise.all([
    getAllBreaksWithSlotsForAdmin(),
    getWithdrawalsForAdmin(),
    getAdminShippingBreakOverview(),
  ]);

  const pendingWithdrawalCount = withdrawals.filter((item) => item.status === "pending").length;
  const pendingShippingCount = shippingBreaks.reduce((total, breakGroup) => {
    return (
      total +
      breakGroup.participants.filter((participant) => {
        const status = getAdminShippingDisplayStatus(participant.shippingRequest);
        return status === "pending" || status === "unrequested";
      }).length
    );
  }, 0);

  const t = await getTranslations("admin");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <div className="mb-2 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("unifiedTitle")}</h1>
        <p className="text-muted">{t("unifiedSubtitle")}</p>
      </div>

      <AdminDashboardTabs
        defaultTab={parseAdminTab(tab)}
        locale={locale}
        breaks={breaks}
        withdrawals={withdrawals}
        shippingBreaks={shippingBreaks}
        pendingWithdrawalCount={pendingWithdrawalCount}
        pendingShippingCount={pendingShippingCount}
      />
    </div>
  );
}
