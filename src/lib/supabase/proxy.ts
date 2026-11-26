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

// keep in sync with the matcher in src/proxy.ts
const PROTECTED_PREFIXES = ["/dashboard", "/progress", "/settings", "/archive", "/habits", "/friends", "/me", "/wrapped"]
const AUTH_PAGES = ["/login"]
/** "/me" and "/me/…", but not "/meetings" */
const isProtected = (path: string) => PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
/** Paths that are not localized pages (route handlers, metadata files). */
const UNLOCALIZED_PREFIXES = ["/auth/", "/api/", "/icon", "/apple-icon", "/manifest", "/robots.txt", "/sitemap.xml"]

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
 * 4. sends signed-in people from the landing page to the app
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

  const finish = (res: NextResponse) => {
    // remember the language (Server Actions read it from this cookie)
    if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
      res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" })
    }
    return res
  }

  // Anonymous visitors have no Supabase auth cookie: skip the session check entirely
  // (saves a round trip on every public page view)
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))
  if (!hasSession) {
    if (isProtected(path)) {
      const url = request.nextUrl.clone()
      url.pathname = localizePath(locale, "/login")
      url.search = ""
      return finish(NextResponse.redirect(url))
    }
    const authError = request.nextUrl.searchParams.get("error_code") ?? request.nextUrl.searchParams.get("error")
    if (authError && path !== "/login") {
      const url = request.nextUrl.clone()
      url.pathname = localizePath(locale, "/login")
      url.search = `?error=${encodeURIComponent(authError)}`
      return finish(NextResponse.redirect(url))
    }
    return finish(response)
  }

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

  if (!isSignedIn && isProtected(path)) return redirectTo("/login")
  if (isSignedIn && AUTH_PAGES.includes(path)) return redirectTo("/dashboard")

  // A signed-in person opening the site (or the logo) goes straight to Today — the
  // landing page sells Streakly to people who don't have it yet. Temporary (307) and
  // never cached: anonymous visitors and search engines carry no session cookie, never
  // reach this branch and keep getting the static landing page from the CDN.
  // Demo guests stay (they may want to read about Streakly and sign up), and "?home"
  // lets a signed-in person open the landing page on purpose ("About Streakly").
  if (isSignedIn && data?.claims?.is_anonymous !== true && path === "/" && !request.nextUrl.searchParams.has("home")) {
    const redirect = redirectTo("/dashboard")
    redirect.headers.set("Cache-Control", "private, no-store")
    return redirect
  }

  return finish(response)
}
