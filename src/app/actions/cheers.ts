"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { getActionT } from "@/i18n/server"
import { getCurrentUser, getToday } from "@/lib/data"
import { guestBlocked } from "@/lib/guest"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validation"

const input = z.object({ toId: z.uuid(), day: z.iso.date() })

/** Ask the push function to tell the recipient (best effort — the cheer itself is saved). */
async function notify(supabase: Awaited<ReturnType<typeof createClient>>, cheerId: string) {
  const { error } = await supabase.functions.invoke("send-reminders", { body: { action: "cheer", cheerId } })
  if (error) console.error("cheer push failed", error)
}

/**
 * A high five for someone's check-ins on `day` (a day from the friends feed).
 * Tapping again takes it back. The database allows it only to people you
 * follow and only for a recent day.
 */
export async function setHighFive(toId: string, day: string, on: boolean): Promise<ActionResult> {
  const blocked = await guestBlocked()
  if (blocked) return blocked
  const { t } = await getActionT()
  if (!input.safeParse({ toId, day }).success) return { ok: false, error: t.validation.invalidInput }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }

  const supabase = await createClient()
  if (!on) {
    const { error } = await supabase.from("cheers").delete().match({ from_id: user.id, to_id: toId, kind: "high_five", day })
    if (error) return { ok: false, error: t.common.somethingWrong }
    refresh()
    return { ok: true }
  }

  const { data, error } = await supabase.from("cheers").insert({ to_id: toId, kind: "high_five", day }).select("id").single()
  // 23505: already given — fine
  if (error && error.code !== "23505") return { ok: false, error: t.common.somethingWrong }
  if (data) await notify(supabase, data.id)
  refresh()
  return { ok: true }
}

/** A friendly nudge to someone who hasn't checked in today — once a day per person. */
export async function sendNudge(toId: string, name: string): Promise<ActionResult> {
  const blocked = await guestBlocked()
  if (blocked) return blocked
  const { t } = await getActionT()
  if (!z.uuid().safeParse(toId).success) return { ok: false, error: t.validation.invalidInput }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }

  const [supabase, { today }] = await Promise.all([createClient(), getToday()])
  const { data, error } = await supabase.from("cheers").insert({ to_id: toId, kind: "nudge", day: today }).select("id").single()
  if (error?.code === "23505") return { ok: true, message: t.cheers.nudgedAlready(name) }
  if (error) return { ok: false, error: t.common.somethingWrong }
  await notify(supabase, data.id)
  refresh()
  return { ok: true, message: t.cheers.nudged(name) }
}
