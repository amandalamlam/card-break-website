import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

/**
 * Stripe success_url fallback without locale prefix.
 * Preserves session_id / order_id and redirects to the default locale success page.
 */
export function GET(request: NextRequest) {
  const incoming = new URL(request.url);
  const target = new URL(`/${routing.defaultLocale}/checkout/success`, incoming.origin);

  for (const key of ["session_id", "order_id"]) {
    const value = incoming.searchParams.get(key);
    if (value) {
      target.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(target);
}
