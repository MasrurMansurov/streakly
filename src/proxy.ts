import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // 1. URLs without a language prefix → redirect to /en or /ru
    "/((?!en(?:/|$)|ru(?:/|$)|auth/|robots\\.txt|sitemap\\.xml|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    // 2. app pages: auth guard + session refresh
    "/(en|ru)/(dashboard|settings|archive|habits|friends)/:path*",
    // 3. public pages only for signed-in visitors (session refresh, /login → /dashboard).
    //    Guests get these pages straight from the CDN without running any function.
    //    (config must be static literals: the Supabase session cookie, whole or chunked)
    { source: "/(en|ru)/:path*", has: [{ type: "cookie", key: "sb-oypfnyzhyyyrinxwtagz-auth-token" }] },
    { source: "/(en|ru)/:path*", has: [{ type: "cookie", key: "sb-oypfnyzhyyyrinxwtagz-auth-token.0" }] },
    // 4. auth errors that Supabase appends to the Site URL (?error=…)
    { source: "/(en|ru)", has: [{ type: "query", key: "error" }] },
  ],
}
