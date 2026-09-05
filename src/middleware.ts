import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const handleI18nRouting = createIntlMiddleware(routing);
const localePattern = routing.locales.join("|");
const localeApiPath = new RegExp(`^/(${localePattern})/api/(.*)$`);

export default async function middleware(request: NextRequest) {
  const localeApi = request.nextUrl.pathname.match(localeApiPath);

  if (localeApi) {
    const url = request.nextUrl.clone();
    url.pathname = `/api/${localeApi[2]}`;
    return NextResponse.rewrite(url);
  }

  const response = handleI18nRouting(request);
  return updateSession(request, response);
}

export const config = {
  matcher: ["/((?!api|auth/callback|_next|_vercel|.*\\..*).*)"],
};
