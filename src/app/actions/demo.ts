"use server"

import { refresh } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

import { getActionLocale, getActionT, localeRedirect } from "@/i18n/server"
import { getCurrentUser } from "@/lib/data"
import { DEFAULT_TIMEZONE, isValidTimezone, logicalToday, parseDayStart, TIMEZONE_COOKIE } from "@/lib/dates"
import { pwnedCount } from "@/lib/pwned"
import { createClient } from "@/lib/supabase/server"
import { authSchema, type ActionResult } from "@/lib/validation"

/**
 * "Try without signing up" (growth plan 1.3): an anonymous Supabase user with
 * ~60 days of sample habits, so the app shows what it looks like in use.
 */
export async function startDemo(): Promise<ActionResult> {
  const [{ t }, locale] = await Promise.all([getActionT(), getActionLocale()])
  if (await getCurrentUser()) return localeRedirect("/dashboard")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInAnonymously()
  if (error) return { ok: false, error: error.status === 429 ? t.demo.rateLimited : t.demo.unavailable }

  const tz = (await cookies()).get(TIMEZONE_COOKIE)?.value
  const today = logicalToday(isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE, parseDayStart(undefined))
  // without samples the demo is still a working (empty) app — don't block on it
  const { error: seedError } = await supabase.rpc("seed_demo", { p_today: today, p_locale: locale })
  if (seedError) console.error("seed_demo failed", seedError.message)
  await supabase.from("events").insert({ name: "demo_started" })
  return localeRedirect("/dashboard")
}

const convertSchema = authSchema.extend({ keepSamples: z.boolean() })

/** Turn the guest into an account: everything done in the demo stays; sample habits optionally go. */
export async function convertGuest(input: z.infer<typeof convertSchema>): Promise<ActionResult> {
  const { t } = await getActionT()
  const parsed = convertSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: t.auth.invalidCredentials }
  const user = await getCurrentUser()
  if (!user?.isGuest) return { ok: false, error: t.validation.notSignedIn }
  if (((await pwnedCount(parsed.data.password)) ?? 0) > 0) return { ok: false, error: t.auth.pwnedPassword }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.updateUser({ email: parsed.data.email, password: parsed.data.password })
  if (error) {
    const taken = error.code === "email_exists" || error.code === "user_already_exists"
    return { ok: false, error: taken ? t.demo.emailTaken : error.message }
  }

  if (!parsed.data.keepSamples) {
    const { data: profile } = await supabase.from("profiles").select("created_at").eq("id", user.id).single()
    await supabase.from("habits").delete().eq("user_id", user.id).eq("is_sample", true)
    // sample moods are the days before the guest existed
    if (profile) await supabase.from("daily_moods").delete().eq("user_id", user.id).lt("day", profile.created_at.slice(0, 10))
  }
  await supabase.from("events").insert({ name: "demo_converted", props: { kept: parsed.data.keepSamples } })

  // the email needs confirming first (when "Confirm email" is on in Supabase)
  if (data.user?.new_email && !data.user.email) return { ok: true, message: t.demo.confirmEmail(parsed.data.email) }
  await supabase.auth.refreshSession() // a fresh token without is_anonymous
  refresh()
  return { ok: true, message: t.demo.saved }
}
