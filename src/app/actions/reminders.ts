"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { getCurrentUser } from "@/lib/data"
import { isValidTimezone } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validation"

const settingsSchema = z.object({
  enabled: z.boolean(),
  remindAt: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, "Pick a time on the hour or half hour"),
  timezone: z.string().max(64).refine(isValidTimezone, "Unknown timezone"),
})

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  p256dh: z.string().min(10).max(200),
  auth: z.string().min(10).max(100),
  userAgent: z.string().max(300).optional(),
})

async function authed() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not signed in")
  return { user, supabase: await createClient() }
}

export async function saveReminderSettings(input: z.infer<typeof settingsSchema>): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" }

  const { user, supabase } = await authed()
  const { error } = await supabase.from("reminder_settings").upsert({
    user_id: user.id,
    enabled: parsed.data.enabled,
    remind_at: parsed.data.remindAt,
    timezone: parsed.data.timezone,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: error.message }

  refresh()
  return { ok: true }
}

/** Store this browser's push subscription (re-subscribing the same endpoint is a no-op). */
export async function savePushSubscription(input: z.infer<typeof subscriptionSchema>): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid push subscription" }

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
  // the session was already verified by getCurrentUser(); pass its token so the
  // function can identify the user (and only send to *their* devices)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: "Not signed in" }
  const { data, error } = await supabase.functions.invoke<{ sent: number; errors: string[] }>("send-reminders", {
    body: { action: "test" },
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (error) return { ok: false, error: "Couldn't send a test notification. Try turning reminders off and on again." }
  if (!data?.sent) return { ok: false, error: data?.errors?.[0] ?? "No device received the notification" }
  return { ok: true, message: `Sent to ${data.sent} device${data.sent === 1 ? "" : "s"}` }
}
