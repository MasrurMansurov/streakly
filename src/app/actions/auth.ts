"use server"

import { headers } from "next/headers"

import { pwnedCount } from "@/lib/pwned"
import { createClient } from "@/lib/supabase/server"
import { getActionLocale, getActionT, localeRedirect } from "@/i18n/server"
import { authSchema, type ActionResult, type AuthInput } from "@/lib/validation"

export async function signIn(input: AuthInput): Promise<ActionResult> {
  const parsed = authSchema.safeParse(input)
  const { t } = await getActionT()
  if (!parsed.success) return { ok: false, error: t.auth.invalidCredentials }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { ok: false, error: error.code === "invalid_credentials" ? t.auth.invalidCredentials : error.message }

  return localeRedirect("/dashboard")
}

export async function signUp(input: AuthInput): Promise<ActionResult> {
  const parsed = authSchema.safeParse(input)
  const { t } = await getActionT()
  if (!parsed.success) return { ok: false, error: t.auth.invalidCredentials }
  // leaked passwords are rejected (if the check service is down, sign-up still works)
  if (((await pwnedCount(parsed.data.password)) ?? 0) > 0) return { ok: false, error: t.auth.pwnedPassword }

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/${await getActionLocale()}/dashboard` },
  })
  // auth messages are meant for the person ("User already registered", rate limits)
  if (error) return { ok: false, error: error.message }

  // "Confirm email" disabled in Supabase → we already have a session
  if (data.session) return localeRedirect("/dashboard")

  return { ok: true, message: t.auth.confirmEmail }
}

export async function signOut() {
  const supabase = await createClient()
  // "local": sign out of this browser only. The default ("global") would also end
  // the user's sessions on every other device.
  await supabase.auth.signOut({ scope: "local" })
  return localeRedirect("/")
}
