import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  PublicBreaksTabs,
  type PublicBreaksTab,
} from "@/components/breaks/PublicBreaksTabs";
import { getCompletedBreaks, getPublicBreaks } from "@/lib/breaks/queries";

function parseBreaksTab(tab: string | undefined): PublicBreaksTab {
  return tab === "completed" ? "completed" : "inProgress";
}

export default async function BreaksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("breaks");
  const [inProgressBreaks, completedBreaks] = await Promise.all([
    getPublicBreaks(),
    getCompletedBreaks(),
  ]);

  const defaultTab = parseBreaksTab(tab);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("listTitle")}</h1>
        <p className="max-w-2xl text-muted">{t("listSubtitle")}</p>
      </div>

      <PublicBreaksTabs
        inProgressBreaks={inProgressBreaks}
        completedBreaks={completedBreaks}
        defaultTab={defaultTab}
      />
    </div>
  );
}
