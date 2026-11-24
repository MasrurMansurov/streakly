"use server"

import { refresh, updateTag } from "next/cache"
import { z } from "zod"

import { getActionT } from "@/i18n/server"
import { getCurrentUser, getToday } from "@/lib/data"
import { weekStart } from "@/lib/streaks"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validation"

const level = z.number().int().min(1).max(5)

async function setup() {
  const [{ t }, user, supabase, { today }] = await Promise.all([getActionT(), getCurrentUser(), createClient(), getToday()])
  return { t, user, supabase, today }
}

/** Today's mood and/or energy (1–5). */
export async function saveFeeling(input: { mood?: number; energy?: number }): Promise<ActionResult> {
  const { t, user, supabase, today } = await setup()
  const parsed = z.object({ mood: level.optional(), energy: level.optional() }).safeParse(input)
  if (!parsed.success || (parsed.data.mood === undefined && parsed.data.energy === undefined)) {
    return { ok: false, error: t.validation.invalidInput }
  }
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const { error } = await supabase
    .from("daily_moods")
    .upsert({ user_id: user.id, day: today, ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" })
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true, message: t.feeling.saved }
}

/** This week's "how automatic does it feel" for a habit (1–5). */
export async function rateStrength(habitId: string, score: number): Promise<ActionResult> {
  const { t, user, supabase, today } = await setup()
  if (!z.uuid().safeParse(habitId).success || !level.safeParse(score).success) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const { error } = await supabase
    .from("habit_strength")
    .upsert({ habit_id: habitId, user_id: user.id, week_start: weekStart(today), score }, { onConflict: "habit_id,week_start" })
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true, message: t.strength.thanks }
}

/** Graduate a habit (autopilot) or bring it back. */
export async function setGraduated(habitId: string, graduated: boolean): Promise<ActionResult> {
  const { t, user, supabase } = await setup()
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const { error } = await supabase
    .from("habits")
    .update({ graduated_at: graduated ? new Date().toISOString() : null })
    .eq("id", habitId)
    .eq("user_id", user.id)
  if (error) return { ok: false, error: error.message }
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single()
  if (profile) updateTag(`profile:${profile.username}`)
  refresh()
  return { ok: true, message: graduated ? t.strength.graduated : undefined }
}
