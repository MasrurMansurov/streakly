import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import {
  isLocale,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  localizePath,
  splitLocale,
  type Locale,
} from "@/i18n/config"

import type { Database } from "./database.types"

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/archive", "/habits"]
const AUTH_PAGES = ["/login"]
/** Paths that are not localized pages (route handlers, metadata files). */
const UNLOCALIZED_PREFIXES = ["/auth/", "/icon", "/apple-icon", "/manifest"]

const ONE_YEAR = 60 * 60 * 24 * 365

function preferredLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value
  return isLocale(saved) ? saved : localeFromAcceptLanguage(request.headers.get("accept-language"))
}

/**
 * Runs on every page request:
 * 1. adds the language prefix to unprefixed URLs (/dashboard → /ru/dashboard)
 * 2. refreshes the Supabase session cookie
 * 3. redirects between protected pages and the login page
 */
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const { locale, path } = splitLocale(pathname)

  if (!locale) {
    if (UNLOCALIZED_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = localizePath(preferredLocale(request), pathname)
    url.search = search
    return NextResponse.redirect(url)
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))
        },
      },
    }
  )

  // Don't put code between createServerClient and getClaims():
  // it validates the JWT and refreshes the session if needed.
  const { data } = await supabase.auth.getClaims()
  const isSignedIn = Boolean(data?.claims?.sub)

  const finish = (res: NextResponse) => {
    // remember the language (Server Actions read it from this cookie)
    if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
      res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" })
    }
    return res
  }

  const redirectTo = (target: string, query = "") => {
    const url = request.nextUrl.clone()
    url.pathname = localizePath(locale, target)
    url.search = query
    const redirect = NextResponse.redirect(url)
    // keep refreshed auth cookies on the redirect response
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return finish(redirect)
  }

  // Supabase sends auth errors (e.g. an expired email link) as query params
  // to the Site URL. Show them on the login page instead of ignoring them.
  const authError = request.nextUrl.searchParams.get("error_code") ?? request.nextUrl.searchParams.get("error")
  if (authError && path !== "/login") {
    return isSignedIn ? redirectTo("/dashboard") : redirectTo("/login", `?error=${encodeURIComponent(authError)}`)
  }

  if (!isSignedIn && PROTECTED_PREFIXES.some((p) => path.startsWith(p))) return redirectTo("/login")
  if (isSignedIn && AUTH_PAGES.includes(path)) return redirectTo("/dashboard")

  return finish(response)
}
