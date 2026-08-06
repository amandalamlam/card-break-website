import type { AppLocale } from "@/i18n/routing";
import { getAppUrl } from "./server";

function normalizeAppUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function buildCheckoutSuccessUrl(locale: AppLocale, orderId: string): string {
  const base = normalizeAppUrl(getAppUrl());
  return `${base}/${locale}/checkout/success?order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`;
}

export function buildCheckoutSuccessUrlCreditOnly(locale: AppLocale, orderId: string): string {
  const base = normalizeAppUrl(getAppUrl());
  return `${base}/${locale}/checkout/success?order_id=${encodeURIComponent(orderId)}`;
}

export function buildCheckoutFailedUrl(
  locale: AppLocale,
  params?: { orderId?: string; reason?: string }
): string {
  const base = normalizeAppUrl(getAppUrl());
  const search = new URLSearchParams();
  if (params?.orderId) {
    search.set("order_id", params.orderId);
  }
  if (params?.reason) {
    search.set("reason", params.reason);
  }
  const query = search.toString();
  return `${base}/${locale}/checkout/failed${query ? `?${query}` : ""}`;
}

export function buildCheckoutCancelUrl(
  locale: AppLocale,
  orderId: string,
  mode: "buy_now" | "cart" = "buy_now"
): string {
  const base = normalizeAppUrl(getAppUrl());
  const params = new URLSearchParams({
    order_id: orderId,
    mode,
    reason: "cancelled",
  });
  return `${base}/${locale}/checkout/failed?${params.toString()}`;
}

/** Cart Stripe cancel → return to /cart with cancellation indicator */
export function buildCartCheckoutCancelUrl(locale: AppLocale, orderId: string): string {
  const base = normalizeAppUrl(getAppUrl());
  const params = new URLSearchParams({
    order_id: orderId,
    cancelled: "1",
  });
  return `${base}/${locale}/cart?${params.toString()}`;
}

/** @deprecated Use buildCheckoutCancelUrl with orderId */
export function buildLegacyCheckoutCancelUrl(
  locale: AppLocale,
  breakId: string,
  slotId: string
): string {
  const base = normalizeAppUrl(getAppUrl());
  const params = new URLSearchParams({ breakId, slotId });
  return `${base}/${locale}/checkout/start?${params.toString()}`;
}
