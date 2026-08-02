"use client";

import { useTranslations } from "next-intl";
import type { SlotStatus } from "@/lib/breaks/types";

const slotStyles: Record<SlotStatus, string> = {
  available: "border-success/40 bg-success/10 text-success",
  locked: "border-accent/40 bg-accent/10 text-accent-soft",
  sold: "border-border bg-surface-elevated text-muted",
  refunded: "border-border bg-surface-elevated text-muted",
};

export function SlotStatusBadgeClient({ status }: { status: SlotStatus }) {
  const t = useTranslations("breaks.slotStatus");

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${slotStyles[status]}`}>
      {t(status)}
    </span>
  );
}
