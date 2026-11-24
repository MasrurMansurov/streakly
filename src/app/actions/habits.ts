"use server"

import { after } from "next/server"

import { refresh, updateTag } from "next/cache"
import { z } from "zod"

import { getCurrentUser } from "@/lib/data"
import { addDays, isISODate, todayIn } from "@/lib/dates"
import { validationMessage } from "@/i18n"
import { getActionT } from "@/i18n/server"
import { nudgePactPartner } from "@/lib/pact-nudge"
import { createClient } from "@/lib/supabase/server"
import { habitSchema, type ActionResult, type HabitInput } from "@/lib/validation"

/** Every action re-checks the session itself — never trust the client. */
async function authed() {
  const user = await getCurrentUser()
  if (!user) throw new Error((await getActionT()).t.validation.notSignedIn)
  const supabase = await createClient()
  return { user, supabase }
}

/** Public profile pages are cached; drop the cache when the owner changes data. */
async function invalidatePublicProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("profiles").select("username").eq("id", userId).single()
  if (data) updateTag(`profile:${data.username}`)
}

export async function createHabit(input: HabitInput): Promise<ActionResult> {
  const parsed = habitSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: validationMessage((await getActionT()).t, parsed.error.issues[0]?.message) }

  const { user, supabase } = await authed()
  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("archived_at", null)

  const { error } = await supabase.from("habits").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    mini_label: parsed.data.mini_label || null,
    cue: parsed.data.cue || null,
    color: parsed.data.color,
    target_per_week: parsed.data.target_per_week,
    position: count ?? 0,
  })
  if (error) return { ok: false, error: error.message }

  await invalidatePublicProfile(supabase, user.id)
  refresh()
  return { ok: true }
}

export async function updateHabit(id: string, input: HabitInput): Promise<ActionResult> {
  const parsed = habitSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: validationMessage((await getActionT()).t, parsed.error.issues[0]?.message) }

  const { user, supabase } = await authed()
  const { error } = await supabase
    .from("habits")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      mini_label: parsed.data.mini_label || null,
      cue: parsed.data.cue || null,
      color: parsed.data.color,
      target_per_week: parsed.data.target_per_week,
    })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await invalidatePublicProfile(supabase, user.id)
  refresh()
  return { ok: true }
}

export async function archiveHabit(id: string): Promise<ActionResult> {
  const { user, supabase } = await authed()
  const { error } = await supabase
    .from("habits")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await invalidatePublicProfile(supabase, user.id)
  refresh()
  return { ok: true }
}

export async function deleteHabit(id: string): Promise<ActionResult> {
  const { user, supabase } = await authed()
  const { error } = await supabase.from("habits").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }

  await invalidatePublicProfile(supabase, user.id)
  refresh()
  return { ok: true }
}

/**
 * Mark / unmark a habit as done on a given day (the client's local date).
 * `mini`: the small version was done — still counts for the streak.
 * Marking an already-checked day again switches between mini and full.
 */
export async function toggleHabitLog(habitId: string, date: string, done: boolean, mini = false): Promise<ActionResult> {
  const { t } = await getActionT()
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: t.validation.invalidInput }
  if (!isISODate(date)) return { ok: false, error: t.validation.invalidDate }

  // The client sends its local date. Allow any timezone (UTC−12…UTC+14),
  // but no days in the future.
  const latestAllowed = addDays(todayIn("UTC"), 1)
  if (date > latestAllowed) return { ok: false, error: t.validation.futureDate }

  const { user, supabase } = await authed()

  let { error } = done
    ? await supabase.from("habit_logs").insert({ habit_id: habitId, log_date: date, is_mini: mini })
    : await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("log_date", date)
  // already checked in that day → switch between mini and full
  if (error?.code === "23505") {
    ;({ error } = await supabase.from("habit_logs").update({ is_mini: mini }).eq("habit_id", habitId).eq("log_date", date))
  }
  if (error) return { ok: false, error: error.message }

  await invalidatePublicProfile(supabase, user.id)
  if (done && date >= addDays(todayIn("UTC"), -1)) {
    // after the response: if this habit is part of a pact, nudge the partner
    after(() => nudgePactPartner(supabase, habitId))
  }
  refresh()
  return { ok: true }
}

/** Persist a new order of the user's active habits (ids in display order). */
export async function reorderHabits(ids: string[]): Promise<ActionResult> {
  const parsed = z.array(z.uuid()).max(100).safeParse(ids)
  if (!parsed.success) return { ok: false, error: (await getActionT()).t.validation.invalidOrder }

  const { user, supabase } = await authed()
  // RLS limits each update to the user's own rows
  const results = await Promise.all(
    parsed.data.map((id, position) => supabase.from("habits").update({ position }).eq("id", id))
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) return { ok: false, error: failed.error.message }

  await invalidatePublicProfile(supabase, user.id)
  refresh()
  return { ok: true }
}

/** Bring an archived habit back; it goes to the end of the active list. */
export async function restoreHabit(id: string): Promise<ActionResult> {
  const { user, supabase } = await authed()
  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("archived_at", null)

  const { error } = await supabase
    .from("habits")
    .update({ archived_at: null, position: count ?? 0 })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await invalidatePublicProfile(supabase, user.id)
  refresh()
  return { ok: true }
}

/** Add, change or (with an empty note) remove the note on a check-in. */
export async function saveNote(habitId: string, date: string, note: string): Promise<ActionResult> {
  const { t } = await getActionT()
  if (!isISODate(date)) return { ok: false, error: t.validation.invalidDate }
  const text = note.trim()
  if (text.length > 280) return { ok: false, error: t.notes.tooLong }

  const { user, supabase } = await authed()
  const { error } = text
    ? await supabase
        .from("habit_notes")
        .upsert({ habit_id: habitId, log_date: date, note: text, updated_at: new Date().toISOString() })
    : await supabase.from("habit_notes").delete().eq("habit_id", habitId).eq("log_date", date).eq("user_id", user.id)
  if (error) {
    // 23503: the day isn't checked off (notes belong to a check-in)
    if (error.code === "23503") return { ok: false, error: t.notes.checkInFirst }
    return { ok: false, error: error.message }
  }
  refresh()
  return { ok: true, message: text ? t.notes.saved : t.notes.removed }
}
