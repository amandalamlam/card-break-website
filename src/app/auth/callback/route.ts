import { createClient } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/auth/redirect";
import { routing } from "@/i18n/routing";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectParam = searchParams.get("redirect");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL(`/${routing.defaultLocale}/auth/login`, origin);
      loginUrl.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(loginUrl);
    }
  }

  const safeRedirect = getSafeRedirect(redirectParam, routing.defaultLocale);
  return NextResponse.redirect(new URL(safeRedirect, origin));
}
