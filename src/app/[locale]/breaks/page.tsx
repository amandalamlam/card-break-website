import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  PublicBreaksTabs,
  type PublicBreaksTab,
} from "@/components/breaks/PublicBreaksTabs";
import {
  getCancelledBreaksPaginatedCached,
  getCompletedBreaksPaginatedCached,
  getHistoryBreakCountCached,
  getPublicBreaksCached,
} from "@/lib/breaks/cached-queries";
import type { BreakListItem } from "@/lib/breaks/types";

export const revalidate = 60;

function parseBreaksTab(tab: string | undefined): PublicBreaksTab {
  if (tab === "completed") {
    return "completed";
  }
  if (tab === "cancelled") {
    return "cancelled";
  }
  return "inProgress";
}

function parsePage(page: string | undefined): number {
  const parsed = Number.parseInt(page ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function BreaksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { tab, page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("breaks");
  const defaultTab = parseBreaksTab(tab);
  const page = parsePage(pageParam);

  const [inProgressBreaks, completedCount, cancelledCount] = await Promise.all([
    getPublicBreaksCached(),
    getHistoryBreakCountCached("completed"),
    getHistoryBreakCountCached("cancelled"),
  ]);

  let historyBreaks: BreakListItem[] = [];
  let historyPagination: { page: number; totalPages: number; totalCount: number } | null =
    null;

  if (defaultTab === "completed") {
    const result = await getCompletedBreaksPaginatedCached(page);
    historyBreaks = result.items;
    historyPagination = {
      page: result.page,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
    };
  } else if (defaultTab === "cancelled") {
    const result = await getCancelledBreaksPaginatedCached(page);
    historyBreaks = result.items;
    historyPagination = {
      page: result.page,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
    };
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("listTitle")}</h1>
        <p className="max-w-2xl text-muted">{t("listSubtitle")}</p>
      </div>

      <PublicBreaksTabs
        inProgressBreaks={inProgressBreaks}
        historyBreaks={historyBreaks}
        completedCount={completedCount}
        cancelledCount={cancelledCount}
        defaultTab={defaultTab}
        historyPagination={historyPagination}
      />
    </div>
  );
}
