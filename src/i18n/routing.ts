import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh-Hant", "en", "zh-Hans"],
  defaultLocale: "zh-Hant",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
