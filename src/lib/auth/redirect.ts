import { routing, type AppLocale } from "@/i18n/routing";

const localePattern = routing.locales.join("|");

export function stripLocalePrefix(path: string): string {
  for (const locale of routing.locales) {
    if (path === `/${locale}`) {
      return "/";
    }
    if (path.startsWith(`/${locale}/`)) {
      return path.slice(locale.length + 1);
    }
  }
  return path;
}

export function getSafeRedirect(path: string | null | undefined, locale: AppLocale): string {
  const fallback = `/${locale}/account`;

  if (!path) {
    return fallback;
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  const localePrefixRegex = new RegExp(`^/(${localePattern})(/|$)`);
  if (!localePrefixRegex.test(path)) {
    return fallback;
  }

  return path;
}

export function buildAuthRedirectPath(
  locale: AppLocale,
  targetPath: string,
  authPage: "login" | "signup"
): string {
  const safeTarget = getSafeRedirect(targetPath, locale);
  const params = new URLSearchParams({ redirect: safeTarget });
  return `/auth/${authPage}?${params.toString()}`;
}
