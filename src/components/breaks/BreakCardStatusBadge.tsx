"use client";

import { useTranslations } from "next-intl";
import {
  BREAK_CARD_BADGE_BASE,
  BREAK_CARD_BADGE_STYLES,
} from "@/components/breaks/break-card-badge-styles";
import type { BreakStatus } from "@/lib/breaks/types";

type BreakCardStatusBadgeProps = {
  status: BreakStatus;
};

export function BreakCardStatusBadge({ status }: BreakCardStatusBadgeProps) {
  const t = useTranslations("breaks.status");

  return (
    <span className={`${BREAK_CARD_BADGE_BASE} ${BREAK_CARD_BADGE_STYLES[status]}`}>
      {t(status)}
    </span>
  );
}
