"use server"

import { refresh } from "next/cache"

import { getActionT } from "@/i18n/server"
import { getCurrentUser, getToday } from "@/lib/data"
import { changeDayStart, MAX_DAY_START_HOUR } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validation"
import { dbFailure } from "@/lib/action-error"

/**
 * When the person's day starts (0–6 h after midnight). Stored in auth metadata,
 * so the server reads it from the token and reminders from auth.users. A change
 * applies from the next day — today never jumps back (see changeDayStart).
 */
export async function setDayStart(hour: number): Promise<ActionResult> {
  const { t } = await getActionT()
  if (!Number.isInteger(hour) || hour < 0 || hour > MAX_DAY_START_HOUR) return { ok: false, error: t.validation.invalidInput }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }

  const { today, dayStart } = await getToday()
  const next = changeDayStart(dayStart, hour, today)
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ data: { day_start: next } })
  if (error) return { ok: false, error: dbFailure(t, error) }
  // a fresh token carries the new setting to the server's "today"
  await supabase.auth.refreshSession()

  refresh()
  return { ok: true, message: next.since ? t.dayStart.fromTomorrow(hour) : t.dayStart.saved(hour) }
}
