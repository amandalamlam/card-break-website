"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const localeShortLabels: Record<AppLocale, string> = {
  "zh-Hant": "繁體",
  en: "EN",
  "zh-Hans": "简体",
};

const localeFullLabels: Record<AppLocale, string> = {
  "zh-Hant": "繁體中文",
  en: "English",
  "zh-Hans": "簡體中文",
};

type LanguageSwitcherProps = {
  className?: string;
  align?: "left" | "right";
  fullWidth?: boolean;
  onSelect?: () => void;
};

export function LanguageSwitcher({
  className = "",
  align = "right",
  fullWidth = false,
  onSelect,
}: LanguageSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(code: AppLocale) {
    if (code !== locale) {
      router.replace(pathname, { locale: code });
    }
    setOpen(false);
    onSelect?.();
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition hover:text-foreground ${
          fullWidth ? "w-full justify-between" : ""
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <Globe className="h-4 w-4 shrink-0" aria-hidden />
          <span className="font-medium text-foreground">{localeShortLabels[locale]}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Language"
          className={`absolute top-[calc(100%+0.5rem)] z-50 min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-background py-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          } ${fullWidth ? "left-0 right-0 min-w-0" : ""}`}
        >
          {routing.locales.map((code) => {
            const isActive = locale === code;

            return (
              <li key={code} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => handleSelect(code)}
                  className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition ${
                    isActive
                      ? "bg-accent/10 font-medium text-accent-soft"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {localeFullLabels[code]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
