import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");

  const stats = [
    { label: t("stats.secure"), icon: "🔒" },
    { label: t("stats.wallet"), icon: "💳" },
    { label: t("stats.shipping"), icon: "📦" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12 md:py-20">
      <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-sm text-accent-soft">
            {t("badge")}
          </span>

          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            {t("headline")}
          </h1>

          <p className="max-w-2xl text-base leading-7 text-muted md:text-lg">{t("subheadline")}</p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="#"
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
            >
              {t("ctaBrowse")}
            </Link>
            <Link
              href="/checkout/start?breakId=demo-break&slotId=demo-lakers"
              className="rounded-xl border border-accent/40 bg-accent/10 px-5 py-3 text-sm font-medium text-accent-soft transition hover:border-accent hover:text-accent"
            >
              {t("testCheckout")}
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground transition hover:border-accent/50 hover:text-accent-soft"
            >
              {t("ctaLearn")}
            </Link>
          </div>
        </div>

        <div className="glass-panel relative overflow-hidden rounded-3xl p-6 shadow-2xl shadow-black/30">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-success/10" />
          <div className="relative space-y-4">
            <div className="rounded-2xl border border-border bg-surface-elevated p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">2026 NBA Prizm Hobby #01</p>
              <p className="mt-2 text-2xl font-semibold">Lakers · Celtics · Warriors</p>
              <p className="mt-3 text-sm text-muted">Slot checkout · 8-minute lock · Wallet refunds</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {["Available", "Locked", "Sold"].map((status) => (
                <div
                  key={status}
                  className="rounded-xl border border-border bg-background/60 px-3 py-4 text-center text-xs text-muted"
                >
                  {status}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-4 text-sm text-accent-soft">
              Phase 0 placeholder — real break listings arrive in Phase 3.
            </div>
          </div>
        </div>
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
