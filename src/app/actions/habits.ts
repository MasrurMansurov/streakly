"use server"

import { refresh, updateTag } from "next/cache"
import { z } from "zod"

import { getCurrentUser } from "@/lib/data"
import { addDays, isISODate, todayIn } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"
import { habitSchema, type ActionResult, type HabitInput } from "@/lib/validation"

/** Every action re-checks the session itself — never trust the client. */
async function authed() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not signed in")
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
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const { user, supabase } = await authed()
  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)

  const { error } = await supabase.from("habits").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    color: parsed.data.color,
    position: count ?? 0,
  })
  if (error) return { ok: false, error: error.message }

  await invalidatePublicProfile(supabase, user.id)
  refresh()
  return { ok: true }
}

export async function updateHabit(id: string, input: HabitInput): Promise<ActionResult> {
  const parsed = habitSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const { user, supabase } = await authed()
  const { error } = await supabase
    .from("habits")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color,
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

/** Mark / unmark a habit as done on a given day (the client's local date). */
export async function toggleHabitLog(habitId: string, date: string, done: boolean): Promise<ActionResult> {
  if (!isISODate(date)) return { ok: false, error: "Invalid date" }

  // The client sends its local date. Allow any timezone (UTC−12…UTC+14),
  // but no days in the future.
  const latestAllowed = addDays(todayIn("UTC"), 1)
  if (date > latestAllowed) return { ok: false, error: "Can't log future days" }

  const { user, supabase } = await authed()

  const { error } = done
    ? await supabase
        .from("habit_logs")
        .upsert({ habit_id: habitId, log_date: date }, { onConflict: "habit_id,log_date", ignoreDuplicates: true })
    : await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("log_date", date)
  if (error) return { ok: false, error: error.message }

  await invalidatePublicProfile(supabase, user.id)
  refresh()
  return { ok: true }
}

/** Persist a new order of the user's active habits (ids in display order). */
export async function reorderHabits(ids: string[]): Promise<ActionResult> {
  const parsed = z.array(z.uuid()).max(100).safeParse(ids)
  if (!parsed.success) return { ok: false, error: "Invalid order" }

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
