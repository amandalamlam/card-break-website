import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const brand = await getTranslations("common");

  return (
    <footer className="border-t border-border/70 bg-surface/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <p>
          {brand("brand")} · {t("tagline")}
        </p>
        <p>
          © {new Date().getFullYear()} {t("rights")}
        </p>
      </div>
    </footer>
  );
}
