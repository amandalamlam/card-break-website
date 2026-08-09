"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminShippingDetailDrawer } from "@/components/admin/AdminShippingDetailDrawer";
import {
  ADMIN_SHIPPING_STATUS_BADGE_CLASS,
  getAdminShippingDisplayStatus,
} from "@/lib/shipping/admin-display";
import type { AdminShippingBreakGroup, AdminShippingParticipantRow } from "@/lib/shipping/types";

type AdminShippingDashboardProps = {
  breaks: AdminShippingBreakGroup[];
  locale: string;
};

export function AdminShippingDashboard({ breaks, locale }: AdminShippingDashboardProps) {
  const t = useTranslations("admin.shipping");
  const [selectedBreakId, setSelectedBreakId] = useState(breaks[0]?.breakId ?? "");
  const [drawerParticipant, setDrawerParticipant] = useState<AdminShippingParticipantRow | null>(
    null
  );

  const selectedBreak = useMemo(
    () => breaks.find((item) => item.breakId === selectedBreakId) ?? breaks[0] ?? null,
    [breaks, selectedBreakId]
  );

  const participants = selectedBreak?.participants ?? [];
  const pendingCount = participants.filter((row) => getAdminShippingDisplayStatus(row.shippingRequest) === "pending").length;
  const unrequestedCount = participants.filter(
    (row) => getAdminShippingDisplayStatus(row.shippingRequest) === "unrequested"
  ).length;

  if (breaks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted">
        {t("noBreaks")}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block min-w-[16rem] space-y-1 text-sm">
            <span className="text-muted">{t("selectBreak")}</span>
            <select
              value={selectedBreak?.breakId ?? ""}
              onChange={(event) => setSelectedBreakId(event.target.value)}
              className="form-select w-full rounded-xl border border-border bg-background/50 px-3 py-2.5"
            >
              {breaks.map((item) => (
                <option key={item.breakId} value={item.breakId}>
                  {item.title} ({item.participants.length})
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-500/15 px-3 py-1 text-slate-300 ring-1 ring-slate-500/30">
              {t("summary.participants", { count: participants.length })}
            </span>
            {unrequestedCount > 0 ? (
              <span className="rounded-full bg-slate-500/15 px-3 py-1 text-slate-300 ring-1 ring-slate-500/30">
                {t("summary.unrequested", { count: unrequestedCount })}
              </span>
            ) : null}
            {pendingCount > 0 ? (
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-200 ring-1 ring-amber-500/30">
                {t("summary.pending", { count: pendingCount })}
              </span>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/40">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/70 text-sm">
              <thead className="bg-background/60">
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted">
                  <th className="px-4 py-3 font-medium">{t("table.user")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.positions")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.method")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      {t("noParticipants")}
                    </td>
                  </tr>
                ) : (
                  participants.map((participant) => {
                    const displayStatus = getAdminShippingDisplayStatus(participant.shippingRequest);

                    return (
                      <tr key={participant.userId} className="hover:bg-background/30">
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium">{participant.email}</p>
                          <p className="text-xs text-muted">{participant.phone}</p>
                        </td>
                        <td className="px-4 py-3 align-top text-foreground/90">
                          {participant.slotNames}
                        </td>
                        <td className="px-4 py-3 align-top text-muted">
                          {participant.shippingRequest?.option_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ADMIN_SHIPPING_STATUS_BADGE_CLASS[displayStatus]}`}
                          >
                            {t(`displayStatus.${displayStatus}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <button
                            type="button"
                            onClick={() => setDrawerParticipant(participant)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
                          >
                            {t("table.detailsAction")}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdminShippingDetailDrawer
        open={drawerParticipant !== null}
        onClose={() => setDrawerParticipant(null)}
        participant={drawerParticipant}
        breakTitle={selectedBreak?.title ?? ""}
        videoUrl={selectedBreak?.videoUrl ?? null}
        locale={locale}
      />
    </>
  );
}
