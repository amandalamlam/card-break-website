import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { buildWalletActivityViewModel, type WalletActivityCopy } from "@/lib/wallet/display";
import {
  getDefaultMonthRange,
  normalizeMonthRange,
  parseWalletHistoryTypeFilter,
  queryWalletHistory,
} from "@/lib/wallet/history-query";
import type { AppLocale } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const defaults = getDefaultMonthRange();
  const { startMonth, endMonth } = normalizeMonthRange(
    url.searchParams.get("startMonth"),
    url.searchParams.get("endMonth")
  );
  const type = parseWalletHistoryTypeFilter(url.searchParams.get("type"));
  const search = url.searchParams.get("search") ?? "";
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "10", 10);
  const locale = (url.searchParams.get("locale") ?? "zh-Hant") as AppLocale;

  const result = await queryWalletHistory({
    userId: user.id,
    startMonth: startMonth ?? defaults.startMonth,
    endMonth: endMonth ?? defaults.endMonth,
    type,
    search,
    page: Number.isNaN(page) ? 1 : page,
    limit: Number.isNaN(limit) ? 10 : limit,
  });

  const t = await getTranslations({ locale, namespace: "account" });

  const copy: WalletActivityCopy = {
    positionsUnit: t.raw("walletActivity.positionsUnit") as string,
    paymentBreakdown: {
      creditFull: t.raw("walletActivity.paymentBreakdown.creditFull") as string,
      hybrid: t.raw("walletActivity.paymentBreakdown.hybrid") as string,
      stripeFull: t.raw("walletActivity.paymentBreakdown.stripeFull") as string,
      stripePartial: t.raw("walletActivity.paymentBreakdown.stripePartial") as string,
    },
    transactionTypes: {
      cancellation_refund: t("transactionTypes.cancellation_refund"),
      purchase: t("transactionTypes.purchase"),
      checkout_release: t("transactionTypes.checkout_release"),
      admin_adjustment: t("transactionTypes.admin_adjustment"),
      withdrawal: t("transactionTypes.withdrawal"),
      withdrawal_reversal: t("transactionTypes.withdrawal_reversal"),
    },
  };

  const activities = result.items.map((tx) => buildWalletActivityViewModel(tx, locale, copy));

  return NextResponse.json({
    activities,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    startMonth,
    endMonth,
    type,
  });
}
