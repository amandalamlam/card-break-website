import { redirect } from "@/i18n/navigation";
import { buildAuthRedirectPath } from "@/lib/auth/redirect";
import { getCurrentProfile } from "@/lib/auth/session";
import type { AppLocale } from "@/i18n/routing";

export async function requireAdmin(locale: AppLocale) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect({
      href: buildAuthRedirectPath(locale, `/${locale}/admin`, "login"),
      locale,
    });
    throw new Error("Admin access requires login.");
  }

  if (profile.role !== "admin") {
    redirect({ href: "/", locale });
    throw new Error("Admin access denied.");
  }

  return profile;
}
