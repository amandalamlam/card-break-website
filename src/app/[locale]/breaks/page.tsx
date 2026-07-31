import { getTranslations, setRequestLocale } from "next-intl/server";
import { BreakCard } from "@/components/breaks/BreakCard";
import { getPublicBreaks } from "@/lib/breaks/queries";

export default async function BreaksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("breaks");
  const breaks = await getPublicBreaks();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <div className="mb-10 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("listTitle")}</h1>
        <p className="max-w-2xl text-muted">{t("listSubtitle")}</p>
      </div>

      {breaks.length === 0 ? (
        <div className="glass-panel rounded-3xl px-6 py-16 text-center">
          <p className="text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {breaks.map((breakItem) => (
            <BreakCard key={breakItem.id} breakItem={breakItem} />
          ))}
        </div>
      )}
    </div>
  );
}
