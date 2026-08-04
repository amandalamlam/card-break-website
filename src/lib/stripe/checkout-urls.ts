import type { AppLocale } from "@/i18n/routing";
import { getAppUrl } from "./server";

function normalizeAppUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function buildCheckoutSuccessUrl(locale: AppLocale, orderId: string): string {
  const base = normalizeAppUrl(getAppUrl());
  // Must keep {CHECKOUT_SESSION_ID} unencoded — Stripe replaces this literal token.
  return `${base}/${locale}/checkout/success?order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`;
}

export function buildCheckoutSuccessUrlCreditOnly(locale: AppLocale, orderId: string): string {
  const base = normalizeAppUrl(getAppUrl());
  return `${base}/${locale}/checkout/success?order_id=${encodeURIComponent(orderId)}`;
}

export function buildCheckoutCancelUrl(
  locale: AppLocale,
  breakId: string,
  slotId: string
): string {
  const base = normalizeAppUrl(getAppUrl());
  const params = new URLSearchParams({ breakId, slotId });
  return `${base}/${locale}/checkout/start?${params.toString()}`;
}
