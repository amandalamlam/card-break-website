"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminBreaksPanel } from "@/components/admin/AdminBreaksPanel";
import { AdminShippingPanel } from "@/components/admin/AdminShippingPanel";
import { AdminWithdrawalsPanel } from "@/components/admin/AdminWithdrawalsPanel";
import type { AdminBreakDetail } from "@/lib/breaks/types";
import type { AdminShippingBreakGroup } from "@/lib/shipping/types";
import type { WithdrawalWithProfile } from "@/lib/wallet/withdrawals";

export type AdminTabId = "breaks" | "withdrawals" | "shipping";

type AdminDashboardTabsProps = {
  defaultTab: AdminTabId;
  locale: string;
  breaks: AdminBreakDetail[];
  withdrawals: WithdrawalWithProfile[];
  shippingBreaks: AdminShippingBreakGroup[];
  pendingWithdrawalCount: number;
  pendingShippingCount: number;
};

type TabConfig = {
  id: AdminTabId;
  label: string;
  badge?: number;
};

export function AdminDashboardTabs({
  defaultTab,
  locale,
  breaks,
  withdrawals,
  shippingBreaks,
  pendingWithdrawalCount,
  pendingShippingCount,
}: AdminDashboardTabsProps) {
  const t = useTranslations("admin");
  const [activeTab, setActiveTab] = useState<AdminTabId>(defaultTab);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const tabs: TabConfig[] = [
    { id: "breaks", label: t("tabs.breaks") },
    {
      id: "shipping",
      label: t("tabs.shipping"),
      badge: pendingShippingCount > 0 ? pendingShippingCount : undefined,
    },
    {
      id: "withdrawals",
      label: t("tabs.withdrawals"),
      badge: pendingWithdrawalCount > 0 ? pendingWithdrawalCount : undefined,
    },
  ];

  const updateIndicator = useCallback(() => {
    const tabOrder: AdminTabId[] = ["breaks", "shipping", "withdrawals"];
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
        className="relative mx-auto my-6 flex max-w-lg items-center justify-between rounded-2xl border border-slate-700/50 bg-slate-800/80 p-1.5 md:mx-0 md:max-w-2xl"
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
              aria-controls={`admin-tab-panel-${tab.id}`}
              id={`admin-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-sm transition-colors duration-200 sm:px-3 ${
                isActive
                  ? "font-bold text-slate-950"
                  : "font-medium text-slate-400 hover:text-white"
              }`}
            >
              <span className="truncate">{tab.label}</span>
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

      <div className="min-h-[16rem]">
        {activeTab === "breaks" ? (
          <div
            role="tabpanel"
            id="admin-tab-panel-breaks"
            aria-labelledby="admin-tab-breaks"
          >
            <AdminBreaksPanel breaks={breaks} />
          </div>
        ) : null}

        {activeTab === "shipping" ? (
          <div
            role="tabpanel"
            id="admin-tab-panel-shipping"
            aria-labelledby="admin-tab-shipping"
          >
            <AdminShippingPanel breaks={shippingBreaks} locale={locale} />
          </div>
        ) : null}

        {activeTab === "withdrawals" ? (
          <div
            role="tabpanel"
            id="admin-tab-panel-withdrawals"
            aria-labelledby="admin-tab-withdrawals"
          >
            <AdminWithdrawalsPanel withdrawals={withdrawals} locale={locale} />
          </div>
        ) : null}
      </div>
    </>
  );
}
