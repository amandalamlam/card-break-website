import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LogoutButton } from "./auth/LogoutButton";
import { getCurrentUser } from "@/lib/auth/session";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const brand = await getTranslations("common");
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <span className="text-gradient-gold">{brand("brand")}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link href="/" className="transition hover:text-foreground">
            {t("breaks")}
          </Link>
          <Link href="/account" className="transition hover:text-foreground">
            {t("account")}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <LogoutButton />
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:text-foreground sm:inline-flex"
              >
                {t("login")}
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-background transition hover:bg-accent-soft"
              >
                {t("signup")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
