"use server"

import { refresh, updateTag } from "next/cache"
import { z } from "zod"

import { getActionT } from "@/i18n/server"
import { getCurrentUser, getToday } from "@/lib/data"
import { addDays, isISODate } from "@/lib/dates"
import { PAUSE_REASONS, type PauseReason } from "@/lib/pause"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validation"
import { dbFailure } from "@/lib/action-error"

async function setup() {
  const [{ t }, user, supabase] = await Promise.all([getActionT(), getCurrentUser(), createClient()])
  return { t, user, supabase }
}

async function invalidateProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("profiles").select("username").eq("id", userId).single()
  if (data) updateTag(`profile:${data.username}`)
}

/** Repair a missed day (yesterday or the day before) — once a month per habit. */
export async function repairStreak(habitId: string, day: string): Promise<ActionResult> {
  const { t, user, supabase } = await setup()
  if (!z.uuid().safeParse(habitId).success || !isISODate(day)) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const { today } = await getToday()
  if (day >= today || day < addDays(today, -2)) return { ok: false, error: t.repair.tooOld }

  const { error } = await supabase.from("habit_repairs").insert({ habit_id: habitId, day })
  if (error) {
    if (error.code === "23505") return { ok: false, error: t.repair.used }
    return { ok: false, error: error.code === "42501" ? t.repair.tooOld : dbFailure(t, error) }
  }
  await invalidateProfile(supabase, user.id)
  refresh()
  return { ok: true, message: t.repair.done }
}

/**
 * The same repair with a spare one (a gift for an accepted invite), when this
 * month's repair is already used. The database checks the day and spends the
 * gift atomically.
 */
export async function repairWithGift(habitId: string, day: string): Promise<ActionResult> {
  const { t, user, supabase } = await setup()
  if (!z.uuid().safeParse(habitId).success || !isISODate(day)) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const { today } = await getToday()
  if (day >= today || day < addDays(today, -2)) return { ok: false, error: t.repair.tooOld }

  const { data: spent, error } = await supabase.rpc("repair_with_gift", { p_habit: habitId, p_day: day })
  if (error) return { ok: false, error: error.code === "42501" ? t.repair.tooOld : t.common.somethingWrong }
  if (!spent) return { ok: false, error: t.repair.used }
  await invalidateProfile(supabase, user.id)
  refresh()
  return { ok: true, message: t.repair.done }
}

/** A pause (vacation, illness, rest) from today until `endDate` (at most 30 days). */
export async function startPause(endDate: string, reason: PauseReason = "vacation"): Promise<ActionResult> {
  const { t, user, supabase } = await setup()
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const { today } = await getToday()
  if (!isISODate(endDate) || endDate < today || endDate > addDays(today, 30)) return { ok: false, error: t.vacation.invalid }
  if (!PAUSE_REASONS.includes(reason)) return { ok: false, error: t.validation.invalidInput }

  const { data: active } = await supabase.from("pauses").select("id").eq("user_id", user.id).gte("end_date", today).limit(1)
  if (active?.length) return { ok: false, error: t.vacation.alreadyOn }

  const { error } = await supabase.from("pauses").insert({ start_date: today, end_date: endDate, reason })
  if (error) return { ok: false, error: dbFailure(t, error) }
  await invalidateProfile(supabase, user.id)
  refresh()
  return { ok: true, message: t.vacation.started[reason] }
}

/** End vacation now: today counts as a normal day again. */
export async function endPause(id: string): Promise<ActionResult> {
  const { t, user, supabase } = await setup()
  if (!z.uuid().safeParse(id).success) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const { today } = await getToday()

  const { data: pause } = await supabase.from("pauses").select("start_date").eq("id", id).eq("user_id", user.id).maybeSingle()
  if (!pause) return { ok: false, error: t.vacation.invalid }
  const { error } =
    pause.start_date >= today
      ? await supabase.from("pauses").delete().eq("id", id)
      : await supabase.from("pauses").update({ end_date: addDays(today, -1) }).eq("id", id)
  if (error) return { ok: false, error: dbFailure(t, error) }
  await invalidateProfile(supabase, user.id)
  refresh()
  return { ok: true, message: t.vacation.ended }
}
