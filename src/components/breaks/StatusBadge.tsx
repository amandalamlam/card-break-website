import { getTranslations } from "next-intl/server";
import type { BreakStatus, SlotStatus } from "@/lib/breaks/types";

const slotStyles: Record<SlotStatus, string> = {
  available: "border-success/40 bg-success/10 text-success",
  locked: "border-accent/40 bg-accent/10 text-accent-soft",
  sold: "border-border bg-surface-elevated text-muted",
  refunded: "border-border bg-surface-elevated text-muted",
};

const breakStyles: Record<BreakStatus, string> = {
  active: "border-success/40 bg-success/10 text-success",
  sold_out: "border-accent/40 bg-accent/10 text-accent-soft",
  completed: "border-border bg-surface-elevated text-muted",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-200",
};

export async function SlotStatusBadge({ status }: { status: SlotStatus }) {
  const t = await getTranslations("breaks.slotStatus");

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${slotStyles[status]}`}>
      {t(status)}
    </span>
  );
}

export async function BreakStatusBadge({ status }: { status: BreakStatus }) {
  const t = await getTranslations("breaks.status");

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${breakStyles[status]}`}>
      {t(status)}
    </span>
  );
}
