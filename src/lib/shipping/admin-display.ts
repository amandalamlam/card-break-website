import type {
  AdminShippingDisplayStatus,
  ShippingRequest,
  ShippingRequestStatus,
} from "@/lib/shipping/types";

export function getAdminShippingDisplayStatus(
  request: ShippingRequest | null
): AdminShippingDisplayStatus {
  if (!request) {
    return "unrequested";
  }

  if (request.status === "pending") {
    return "pending";
  }

  if (request.status === "shipped") {
    return "shipped";
  }

  return "completed";
}

export const ADMIN_SHIPPING_STATUS_BADGE_CLASS: Record<AdminShippingDisplayStatus, string> = {
  unrequested: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
  pending: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  shipped: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  completed: "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30",
};

export const USER_SHIPPING_STATUS_BADGE_CLASS: Record<ShippingRequestStatus, string> = {
  pending: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  shipped: "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
};

export function formatAdminShippingDate(createdAt: string, locale: string): string {
  return new Date(createdAt)
    .toLocaleString(locale, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ");
}
