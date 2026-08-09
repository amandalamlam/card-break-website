"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AdminShippingDashboard } from "@/components/admin/AdminShippingDashboard";
import type { AdminShippingBreakGroup } from "@/lib/shipping/types";

type AdminShippingPanelProps = {
  breaks: AdminShippingBreakGroup[];
  locale: string;
};

export function AdminShippingPanel({ breaks, locale }: AdminShippingPanelProps) {
  const t = useTranslations("admin.shipping");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{t("subtitle")}</p>
        <Link
          href="/admin/shipping-options"
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground"
        >
          {t("manageOptions")}
        </Link>
      </div>

      <AdminShippingDashboard breaks={breaks} locale={locale} />
    </div>
  );
}
