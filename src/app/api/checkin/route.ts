import { revalidateTag } from "next/cache"
import { after, type NextRequest } from "next/server"
import { z } from "zod"

import { getCurrentUser, getToday } from "@/lib/data"
import { nudgePactPartner } from "@/lib/pact-nudge"
import { isDueToday } from "@/lib/streaks"
import { createClient } from "@/lib/supabase/server"
import type { ISODate } from "@/lib/dates"
import { addDays } from "@/lib/dates"

const body = z.object({ habitId: z.uuid() })

/**
 * One-tap check-in from a push notification action (called by the service
 * worker with the user's cookies). Marks the habit done for the user's today.
 */
export async function POST(request: NextRequest) {
  // same-origin only: the service worker / page, never another site
  const site = request.headers.get("sec-fetch-site")
  const origin = request.headers.get("origin")
  if ((site && site !== "same-origin") || (origin && new URL(origin).host !== request.nextUrl.host)) {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }

  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 })
  const { habitId } = parsed.data

  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })
  const [{ today }, supabase] = await Promise.all([getToday(), createClient()])

  const { data: habit } = await supabase
    .from("habits")
    .select("id, name")
    .eq("id", habitId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle()
  if (!habit) return Response.json({ error: "not found" }, { status: 404 })

  const { error } = await supabase
    .from("habit_logs")
    .upsert({ habit_id: habitId, log_date: today }, { onConflict: "habit_id,log_date", ignoreDuplicates: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // how many habits are still due today (for the app-icon badge)
  const weekAgo = addDays(today, -7)
  const [{ data: habits }, { data: logs }, { data: profile }] = await Promise.all([
    supabase.from("habits").select("id, target_per_week").eq("user_id", user.id).is("archived_at", null),
    supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", user.id).gte("log_date", weekAgo),
    supabase.from("profiles").select("username").eq("id", user.id).single(),
  ])
  const byHabit = new Map<string, Set<ISODate>>()
  for (const l of logs ?? []) byHabit.set(l.habit_id, (byHabit.get(l.habit_id) ?? new Set()).add(l.log_date as ISODate))
  const left = (habits ?? []).filter((h) => isDueToday(byHabit.get(h.id) ?? new Set(), today, h.target_per_week)).length

  if (profile) revalidateTag(`profile:${profile.username}`, "max")
  after(() => nudgePactPartner(supabase, habitId))
  return Response.json({ ok: true, name: habit.name, left })
}
