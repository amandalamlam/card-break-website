import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

export function GET(request: NextRequest) {
  const incoming = new URL(request.url);
  const target = new URL(`/${routing.defaultLocale}/checkout/failed`, incoming.origin);

  for (const key of ["order_id", "mode", "reason"]) {
    const value = incoming.searchParams.get(key);
    if (value) {
      target.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(target);
}
