import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BreakCard } from "@/components/breaks/BreakCard";
import { getCompletedBreaks, getPublicBreaks } from "@/lib/breaks/queries";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const breaksT = await getTranslations("breaks");
  const [breaks, completedBreaks] = await Promise.all([
    getPublicBreaks(),
    getCompletedBreaks(3),
  ]);
  const featuredBreaks = breaks.slice(0, 3);

  const stats = [
    { label: t("stats.secure"), icon: "🔒" },
    { label: t("stats.wallet"), icon: "💳" },
    { label: t("stats.shipping"), icon: "📦" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12 md:py-20">
      <section className="space-y-6">
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-sm text-accent-soft">
          {t("badge")}
        </span>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          {t("headline")}
        </h1>

        <p className="max-w-2xl text-base leading-7 text-muted md:text-lg">{t("subheadline")}</p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/breaks"
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
          >
            {t("ctaBrowse")}
          </Link>
          <Link
            href="#live-breaks"
            className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground transition hover:border-accent/50 hover:text-accent-soft"
          >
            {t("ctaLearn")}
          </Link>
        </div>
      </section>

      <section id="live-breaks" className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{breaksT("featuredTitle")}</h2>
            <p className="mt-2 text-sm text-muted">{breaksT("featuredSubtitle")}</p>
          </div>
          <Link href="/breaks" className="text-sm font-medium text-accent-soft hover:text-accent">
            {breaksT("viewAll")}
          </Link>
        </div>

        {featuredBreaks.length === 0 ? (
          <div className="glass-panel rounded-3xl px-6 py-12 text-center text-muted">
            {breaksT("empty")}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredBreaks.map((breakItem) => (
              <BreakCard key={breakItem.id} breakItem={breakItem} />
            ))}
          </div>
        )}
      </section>

      <section id="recently-completed" className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{breaksT("recentlyCompletedTitle")}</h2>
            <p className="mt-2 text-sm text-muted">{breaksT("recentlyCompletedSubtitle")}</p>
          </div>
          <Link
            href="/breaks?tab=completed"
            className="shrink-0 text-sm font-medium text-accent-soft hover:text-accent"
          >
            {breaksT("viewAllHistory")}
          </Link>
        </div>

        {completedBreaks.length === 0 ? (
          <div className="glass-panel rounded-3xl px-6 py-12 text-center text-muted">
            {breaksT("emptyCompleted")}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {completedBreaks.map((breakItem) => (
              <BreakCard key={breakItem.id} breakItem={breakItem} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="glass-panel rounded-2xl p-5">
            <div className="text-2xl">{item.icon}</div>
            <p className="mt-3 text-sm font-medium text-foreground">{item.label}</p>
          </div>
        ))}
      </section>

      <section id="how-it-works" className="glass-panel rounded-3xl p-8">
        <p className="text-sm text-accent-soft">{t("phaseNote")}</p>
      </section>
    </div>
  );
}
