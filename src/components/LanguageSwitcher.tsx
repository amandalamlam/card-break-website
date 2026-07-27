"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const localeLabels: Record<AppLocale, string> = {
  "zh-Hant": "繁體",
  en: "EN",
  "zh-Hans": "简体",
};

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted sm:inline">{t("language")}</span>
      <div className="flex rounded-lg border border-border bg-surface p-1">
        {routing.locales.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => router.replace(pathname, { locale: code })}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              locale === code
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            }`}
            aria-current={locale === code ? "true" : undefined}
          >
            {localeLabels[code]}
          </button>
        ))}
      </div>
    </div>
  );
}
