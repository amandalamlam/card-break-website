import type { BreakStatus } from "@/lib/breaks/types";

export const BREAK_CARD_BADGE_BASE =
  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-md shadow-sm";

export const BREAK_CARD_BADGE_STYLES: Record<BreakStatus, string> = {
  active: "border-emerald-500/50 bg-emerald-950/90 text-emerald-300",
  sold_out: "border-emerald-500/50 bg-emerald-950/90 text-emerald-300",
  completed: "border-blue-500/40 bg-blue-950/90 text-blue-300",
  cancelled: "border-slate-600/40 bg-slate-900/90 text-slate-300",
};
