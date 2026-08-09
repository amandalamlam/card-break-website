"use client";

import { useTranslations } from "next-intl";
import type { BreakStatus } from "@/lib/breaks/types";

const breakStyles: Record<BreakStatus, string> = {
  active: "border-success/40 bg-success/10 text-success",
  sold_out: "border-accent/40 bg-accent/10 text-accent-soft",
  completed: "border-border bg-surface-elevated text-muted",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-200",
};

type BreakStatusBadgeClientProps = {
  status: BreakStatus;
};

export function BreakStatusBadgeClient({ status }: BreakStatusBadgeClientProps) {
  const t = useTranslations("breaks.status");

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${breakStyles[status]}`}
    >
      {t(status)}
    </span>
  );
}
