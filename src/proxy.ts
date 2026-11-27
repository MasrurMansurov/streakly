import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

/** Usernames are a–z 0–9 _ — a capital letter in a profile URL is always a duplicate of the lowercase one. */
const UPPERCASE_PROFILE = /^\/(en|ru)\/u\/([^/]*[A-Z][^/]*)\/?$/

export async function proxy(request: NextRequest) {
  const profile = UPPERCASE_PROFILE.exec(request.nextUrl.pathname)
  if (profile) {
    const url = request.nextUrl.clone()
    url.pathname = `/${profile[1]}/u/${profile[2].toLowerCase()}`
    return NextResponse.redirect(url, 308) // permanent: search engines merge the duplicate
  }
  return updateSession(request)
}

export const config = {
  matcher: [
    // 1. URLs without a language prefix → redirect to /en or /ru
    //    (files from public/ pass through: images, and .txt / .html / .xml for search-console
    //    ownership files and the IndexNow key — a redirect would make them fail)
    //    (and the platform's own /_vercel/* — analytics scripts — is never ours to touch)
    "/((?!en(?:/|$)|ru(?:/|$)|auth/|api/|_vercel/|robots\\.txt|sitemap\\.xml|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|html|xml)$).*)",
    // 2. app pages: auth guard + session refresh (keep in sync with PROTECTED_PREFIXES)
    "/(en|ru)/(dashboard|progress|settings|archive|habits|friends|me|wrapped)/:path*",
    // 3. public pages only for signed-in visitors (session refresh, /login → /dashboard).
    //    Guests get these pages straight from the CDN without running any function.
    //    (config must be static literals: the Supabase session cookie, whole or chunked)
    { source: "/(en|ru)/:path*", has: [{ type: "cookie", key: "sb-oypfnyzhyyyrinxwtagz-auth-token" }] },
    { source: "/(en|ru)/:path*", has: [{ type: "cookie", key: "sb-oypfnyzhyyyrinxwtagz-auth-token.0" }] },
    // 4. /en/u/Demo → /en/u/demo (only URLs with a capital letter reach the proxy; the rest stay on the CDN)
    "/(en|ru)/u/:username([^/]*[A-Z][^/]*)",
    // 5. auth errors that Supabase appends to the Site URL (?error=…)
    { source: "/(en|ru)", has: [{ type: "query", key: "error" }] },
  ],
}
