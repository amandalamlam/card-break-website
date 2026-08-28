"use client";

import { useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { CartNavLink } from "@/components/cart/CartNavLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { LogoutButton } from "./auth/LogoutButton";
import {
  getHeaderAuthVisibility,
  HeaderAuthSkeleton,
} from "@/components/header/header-auth-visibility";
import { useAuthSession } from "@/context/AuthSessionContext";
import { isAuthPagePath } from "@/lib/auth/redirect";

export function SiteHeaderClient() {
  const t = useTranslations("nav");
  const brand = useTranslations("common");
  const pathname = usePathname();
  const { isAuthenticated, isAdmin, isLoading } = useAuthSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthPage = isAuthPagePath(pathname);

  const authVisibility = getHeaderAuthVisibility({
    isAuthenticated,
    isLoading,
    isAuthPage,
  });

  const navLinks = useMemo(
    () =>
      [
        { href: "/breaks", label: t("breaks"), show: true },
        { href: "/account", label: t("account"), show: true },
        { href: "/cart", label: t("cart"), show: isAuthenticated, isCart: true },
        { href: "/admin", label: t("admin"), show: isAdmin, accent: true },
      ]
        .filter((item) => item.show)
        .map(({ href, label, accent, isCart }) => ({ href, label, accent, isCart })),
    [isAdmin, isAuthenticated, t]
  );

  return (
    <>
      <header className="border-b border-border/70 bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            <span className="text-gradient-gold">{brand("brand")}</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            {navLinks.map((item) =>
              item.isCart ? (
                <CartNavLink key={item.href} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition hover:text-foreground ${
                    item.accent ? "hover:text-accent-soft" : ""
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            {authVisibility.showSkeleton ? (
              <HeaderAuthSkeleton />
            ) : authVisibility.showLogout ? (
              <div className="hidden md:block">
                <LogoutButton />
              </div>
            ) : authVisibility.showGuestAuth ? (
              <>
                <Link
                  href="/auth/login"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition hover:text-foreground sm:px-3 sm:py-2 sm:text-sm"
                >
                  {t("login")}
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-background transition hover:bg-accent-soft sm:px-3 sm:py-2 sm:text-sm"
                >
                  {t("signup")}
                </Link>
              </>
            ) : null}

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex rounded-lg border border-border p-2 text-muted transition hover:text-foreground md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <MobileNavDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        brandLabel={brand("brand")}
        navLinks={navLinks}
        authVisibility={authVisibility}
      />
    </>
  );
}
