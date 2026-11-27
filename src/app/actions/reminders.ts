"use server"

import { FunctionsHttpError } from "@supabase/supabase-js"
import { refresh } from "next/cache"
import { z } from "zod"

import { getCurrentUser } from "@/lib/data"
import { isValidTimezone } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"
import { locales } from "@/i18n"
import { getActionLocale, getActionT } from "@/i18n/server"
import type { ActionResult } from "@/lib/validation"
import { guestBlocked } from "@/lib/guest"
import { dbFailure } from "@/lib/action-error"

const settingsSchema = z.object({
  enabled: z.boolean(),
  // any minute: the scheduler runs every minute
  remindAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "timeInvalid"),
  timezone: z.string().max(64).refine(isValidTimezone, "unknownTimezone"),
  locale: z.enum(locales).optional(),
})

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  p256dh: z.string().min(10).max(200),
  auth: z.string().min(10).max(100),
  userAgent: z.string().max(300).optional(),
})

async function authed() {
  const user = await getCurrentUser()
  if (!user) throw new Error((await getActionT()).t.validation.notSignedIn)
  return { user, supabase: await createClient() }
}

export async function saveReminderSettings(input: z.infer<typeof settingsSchema>): Promise<ActionResult> {
  const blocked = await guestBlocked()
  if (blocked) return blocked
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) {
    const { t } = await getActionT()
    const key = parsed.error.issues[0]?.message ?? ""
    return { ok: false, error: (t.reminders as Record<string, unknown>)[key] as string ?? t.validation.invalidInput }
  }

  const { user, supabase } = await authed()
  const { error } = await supabase.from("reminder_settings").upsert({
    user_id: user.id,
    enabled: parsed.data.enabled,
    remind_at: parsed.data.remindAt,
    timezone: parsed.data.timezone,
    // notifications are sent in the language the user last used
    locale: parsed.data.locale ?? (await getActionLocale()),
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: dbFailure((await getActionT()).t, error) }

  refresh()
  return { ok: true }
}

const turnOnSchema = z.object({
  timezone: z.string().max(64).refine(isValidTimezone),
  locale: z.enum(locales).optional(),
})

/**
 * Switch reminders on (keeping the daily time if one was set). Used when a
 * habit gets its own reminder time: without the master switch and a device,
 * that reminder would silently never arrive.
 */
export async function turnOnReminders(input: z.infer<typeof turnOnSchema>): Promise<ActionResult> {
  const blocked = await guestBlocked()
  if (blocked) return blocked
  const parsed = turnOnSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: (await getActionT()).t.validation.invalidInput }

  const { user, supabase } = await authed()
  const { data: existing } = await supabase.from("reminder_settings").select("enabled").eq("user_id", user.id).maybeSingle()
  const locale = parsed.data.locale ?? (await getActionLocale())
  const { error } = existing
    ? await supabase
        .from("reminder_settings")
        .update({ enabled: true, timezone: parsed.data.timezone, locale, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
    : await supabase
        .from("reminder_settings")
        .insert({ user_id: user.id, enabled: true, timezone: parsed.data.timezone, locale })
  if (error) return { ok: false, error: dbFailure((await getActionT()).t, error) }
  refresh()
  return { ok: true }
}

/**
 * Move the reminders' timezone to the device's current one (called on app
 * open by <TimezoneSync />). Reminders and the UI then agree on "today".
 * No-op when signed out or reminders were never set up.
 */
export async function syncTimezone(timezone: string): Promise<ActionResult> {
  if (typeof timezone !== "string" || timezone.length > 64 || !isValidTimezone(timezone)) return { ok: false, error: "timezone" }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "signed out" }
  const supabase = await createClient()
  const { error } = await supabase
    .from("reminder_settings")
    .update({ timezone, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .neq("timezone", timezone)
  return error ? { ok: false, error: dbFailure((await getActionT()).t, error) } : { ok: true }
}

/**
 * Store (or refresh) this browser's push subscription for the signed-in user.
 * Called when reminders are switched on and on every app open (<PushSync />):
 * updates rotated keys, marks the device as seen, and moves a shared device's
 * subscription to whoever is signed in now.
 */
export async function savePushSubscription(input: z.infer<typeof subscriptionSchema>): Promise<ActionResult> {
  const blocked = await guestBlocked()
  if (blocked) return blocked
  const parsed = subscriptionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: (await getActionT()).t.reminders.invalidSubscription }

  const { supabase } = await authed()
  const { error } = await supabase.rpc("claim_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.p256dh,
    p_auth: parsed.data.auth,
    p_user_agent: parsed.data.userAgent,
  })
  if (error) return { ok: false, error: dbFailure((await getActionT()).t, error) }
  return { ok: true }
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const { user, supabase } = await authed()
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id)
  if (error) return { ok: false, error: dbFailure((await getActionT()).t, error) }
  return { ok: true }
}

/** Ask the Edge Function to send a test notification to all of the user's devices. */
export async function sendTestNotification(): Promise<ActionResult> {
  const blocked = await guestBlocked()
  if (blocked) return blocked
  const { supabase } = await authed()
  const { t } = await getActionT()

  // getCurrentUser() checks the JWT signature locally, which stays valid until the
  // token expires even if the session was ended elsewhere. The Edge Function asks
  // the auth server, so confirm the session there first and use a fresh token.
  const { error: userError } = await supabase.auth.getUser()
  if (userError) return { ok: false, error: t.reminders.sessionEnded }
  let {
    data: { session },
  } = await supabase.auth.getSession()
  if (session && (session.expires_at ?? 0) * 1000 < Date.now() + 60_000) {
    session = (await supabase.auth.refreshSession()).data.session
  }
  if (!session) return { ok: false, error: t.reminders.sessionEnded }

  const { data, error } = await supabase.functions.invoke<{ sent: number; removed: number; errors: string[] }>(
    "send-reminders",
    { body: { action: "test" }, headers: { Authorization: `Bearer ${session.access_token}` } }
  )
  if (error) {
    const detail = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null
    if (detail?.error === "no subscriptions")
      return { ok: false, error: t.reminders.noDevices }
    return { ok: false, error: t.reminders.testFailed(detail?.error ?? error.message) }
  }
  if (!data?.sent) {
    if (data?.removed) return { ok: false, error: t.reminders.expired }
    return { ok: false, error: data?.errors?.[0] ?? t.reminders.noneReceived }
  }
  return { ok: true, message: t.reminders.sent(data.sent) }
}
