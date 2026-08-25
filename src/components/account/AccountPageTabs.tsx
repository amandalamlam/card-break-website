"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CompletedBreaksListClient } from "@/components/account/CompletedBreaksListClient";
import { WalletHistoryPanel } from "@/components/account/WalletHistoryPanel";
import { formatPrice } from "@/lib/breaks/format";
import type { CompletedBreakShipping } from "@/lib/shipping/types";

type MonthOption = {
  value: string;
  label: string;
};

export type AccountTabId = "overview" | "shipping" | "wallet";

type AccountPageTabsProps = {
  defaultTab?: AccountTabId;
  locale: string;
  email: string;
  phone: string;
  role: string;
  availableCredit: number;
  creditReserved: number;
  completedBreaks: CompletedBreakShipping[];
  pendingShippingCount: number;
  monthOptions: MonthOption[];
  defaultStartMonth: string;
  defaultEndMonth: string;
};

type TabConfig = {
  id: AccountTabId;
  label: string;
  badge?: number;
};

function tabHref(tab: AccountTabId) {
  if (tab === "overview") {
    return "/account";
  }

  return `/account?tab=${tab}`;
}

export function AccountPageTabs({
  defaultTab = "overview",
  locale,
  email,
  phone,
  role,
  availableCredit,
  creditReserved,
  completedBreaks,
  pendingShippingCount,
  monthOptions,
  defaultStartMonth,
  defaultEndMonth,
}: AccountPageTabsProps) {
  const t = useTranslations("account");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AccountTabId>(defaultTab);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  function switchTab(next: AccountTabId) {
    setActiveTab(next);
    router.replace(tabHref(next), { scroll: false });
  }

  const tabs: TabConfig[] = [
    { id: "overview", label: t("tabs.overview") },
    {
      id: "shipping",
      label: t("tabs.shipping"),
      badge: pendingShippingCount > 0 ? pendingShippingCount : undefined,
    },
    { id: "wallet", label: t("tabs.wallet") },
  ];

  const updateIndicator = useCallback(() => {
    const tabOrder: AccountTabId[] = ["overview", "shipping", "wallet"];
    const activeIndex = tabOrder.indexOf(activeTab);
    const activeButton = tabRefs.current[activeIndex];
    const container = containerRef.current;

    if (!activeButton || !container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    setIndicatorStyle({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useLayoutEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  return (
    <>
      <div
        ref={containerRef}
        role="tablist"
        aria-label={t("tabs.ariaLabel")}
        className="relative mx-auto my-6 flex max-w-md items-center justify-between rounded-2xl border border-slate-700/50 bg-slate-800/80 p-1.5 backdrop-blur-md md:mx-0"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1.5 bottom-1.5 rounded-xl bg-[#f5c563] shadow-md transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />

        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`account-tab-panel-${tab.id}`}
              id={`account-tab-${tab.id}`}
              onClick={() => switchTab(tab.id)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-sm transition-colors duration-200 sm:px-3 ${
                isActive
                  ? "font-bold text-slate-950"
                  : "font-medium text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined ? (
                <span
                  className={`tabular-nums ${isActive ? "text-slate-800" : "text-slate-500"}`}
                >
                  ({tab.badge})
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-[12rem]">
        {activeTab === "overview" ? (
          <div
            role="tabpanel"
            id="account-tab-panel-overview"
            aria-labelledby="account-tab-overview"
            className="transition-opacity duration-200"
          >
            <div className="glass-panel space-y-6 rounded-3xl p-8">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("email")}</p>
                  <p className="mt-1 font-medium">{email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("phone")}</p>
                  <p className="mt-1 font-medium">{phone}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("wallet")}</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-2xl font-semibold text-accent-soft">
                      {formatPrice(availableCredit)}
                    </p>
                    <Link href="/account/withdraw" className="withdraw-action-link">
                      <span className="withdraw-action-link__label">
                        {t("withdrawals.openAction")}
                      </span>
                    </Link>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    {t("walletReserved")}
                  </p>
                  <p className="mt-1 font-medium">{formatPrice(creditReserved)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("role")}</p>
                  <p className="mt-1 font-medium capitalize">{role}</p>
                </div>
              </div>

              <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-3 text-sm text-muted">
                {t("walletNote")}
              </p>
            </div>
          </div>
        ) : null}

        {activeTab === "shipping" ? (
          <div
            role="tabpanel"
            id="account-tab-panel-shipping"
            aria-labelledby="account-tab-shipping"
            className="space-y-4 transition-opacity duration-200"
          >
            <div>
              <h2 className="text-xl font-semibold">{t("shippingTitle")}</h2>
              <p className="mt-1 text-sm text-muted">{t("shippingSubtitle")}</p>
            </div>
            <CompletedBreaksListClient breaks={completedBreaks} />
          </div>
        ) : null}

        {activeTab === "wallet" ? (
          <div
            role="tabpanel"
            id="account-tab-panel-wallet"
            aria-labelledby="account-tab-wallet"
            className="space-y-4 transition-opacity duration-200"
          >
            <div>
              <h2 className="text-xl font-semibold">{t("walletHistory.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("walletHistory.subtitle")}</p>
            </div>
            <WalletHistoryPanel
              locale={locale}
              monthOptions={monthOptions}
              defaultStartMonth={defaultStartMonth}
              defaultEndMonth={defaultEndMonth}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
