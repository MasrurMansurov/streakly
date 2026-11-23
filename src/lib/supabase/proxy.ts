import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "./database.types"

const PROTECTED_PREFIXES = ["/dashboard", "/settings"]
const AUTH_PAGES = ["/login"]

/**
 * Refreshes the Supabase session cookie on every request and
 * redirects between protected pages and the login page.
 */
export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))
        },
      },
    }
  )

  // Don't put code between createServerClient and getClaims():
  // it validates the JWT and refreshes the session if needed.
  const { data } = await supabase.auth.getClaims()
  const isSignedIn = Boolean(data?.claims?.sub)
  const { pathname } = request.nextUrl

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ""
    const redirect = NextResponse.redirect(url)
    // keep refreshed auth cookies on the redirect response
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  if (!isSignedIn && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return redirectTo("/login")
  }
  if (isSignedIn && AUTH_PAGES.includes(pathname)) {
    return redirectTo("/dashboard")
  }

  return response
}
