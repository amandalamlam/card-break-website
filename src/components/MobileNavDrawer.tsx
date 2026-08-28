"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CartNavLink } from "@/components/cart/CartNavLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LogoutButton } from "./auth/LogoutButton";
import type { HeaderAuthVisibility } from "./header/header-auth-visibility";

type NavLink = {
  href: string;
  label: string;
  accent?: boolean;
  isCart?: boolean;
};

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  brandLabel: string;
  navLinks: NavLink[];
  authVisibility: HeaderAuthVisibility;
};

export function MobileNavDrawer({
  open,
  onClose,
  brandLabel,
  navLinks,
  authVisibility,
}: MobileNavDrawerProps) {
  const t = useTranslations("nav");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      <aside
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="fixed top-0 right-0 z-50 flex h-full w-[80vw] max-w-xs flex-col justify-between bg-slate-950 p-6 shadow-2xl md:hidden"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{brandLabel}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 p-2 text-muted transition hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto py-6">
          <nav className="space-y-1">
            {navLinks.map((item) =>
              item.isCart ? (
                <CartNavLink key={item.href} variant="drawer" onNavigate={onClose} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`block rounded-xl px-3 py-3 text-base transition hover:bg-slate-900 ${
                    item.accent
                      ? "text-accent-soft hover:text-accent-soft"
                      : "text-foreground/90 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}

            {authVisibility.showGuestAuth ? (
              <>
                <Link
                  href="/auth/login"
                  onClick={onClose}
                  className="block rounded-xl px-3 py-3 text-base text-foreground/90 transition hover:bg-slate-900 hover:text-foreground"
                >
                  {t("login")}
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={onClose}
                  className="block rounded-xl bg-accent px-3 py-3 text-center text-base font-medium text-background transition hover:bg-accent-soft"
                >
                  {t("signup")}
                </Link>
              </>
            ) : null}
          </nav>

          <div className="mt-6">
            <LanguageSwitcher fullWidth align="left" onSelect={onClose} />
          </div>
        </div>

        {authVisibility.showLogout ? (
          <div className="mt-auto border-t border-slate-800 pt-6 text-rose-400">
            <LogoutButton
              variant="drawer"
              className="w-full justify-start px-3 py-3"
              icon={<LogOut className="h-4 w-4" aria-hidden />}
            />
          </div>
        ) : null}
      </aside>
    </>,
    document.body
  );
}
