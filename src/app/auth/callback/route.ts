import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

/** Email confirmation / OAuth redirect target: exchanges ?code= for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next") ?? "/dashboard"
  // only allow relative redirects
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  // the provider said no (e.g. the person cancelled on Google's screen)
  const providerError = searchParams.get("error")
  const reason = providerError && /^[a-z_]{1,40}$/.test(providerError) ? providerError : "auth"
  return NextResponse.redirect(`${origin}/login?error=${reason}`)
}
