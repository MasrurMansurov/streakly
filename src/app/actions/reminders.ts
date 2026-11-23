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

const settingsSchema = z.object({
  enabled: z.boolean(),
  // the scheduler runs every 15 minutes
  remindAt: z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, "timeStep"),
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
  if (error) return { ok: false, error: error.message }

  refresh()
  return { ok: true }
}

/** Store this browser's push subscription (re-subscribing the same endpoint is a no-op). */
export async function savePushSubscription(input: z.infer<typeof subscriptionSchema>): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: (await getActionT()).t.reminders.invalidSubscription }

  const { supabase } = await authed()
  const { error } = await supabase.from("push_subscriptions").insert({
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.p256dh,
    auth: parsed.data.auth,
    user_agent: parsed.data.userAgent ?? null,
  })
  // 23505 = this device is already subscribed
  if (error && error.code !== "23505") return { ok: false, error: error.message }
  return { ok: true }
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const { user, supabase } = await authed()
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Ask the Edge Function to send a test notification to all of the user's devices. */
export async function sendTestNotification(): Promise<ActionResult> {
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
