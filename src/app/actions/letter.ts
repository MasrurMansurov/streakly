"use server"

import Anthropic from "@anthropic-ai/sdk"
import { refresh } from "next/cache"

import { getActionLocale, getActionT } from "@/i18n/server"
import { getDashboardData } from "@/lib/data"
import type { ISODate } from "@/lib/dates"
import { findInsights, type DayFeeling } from "@/lib/insights"
import { LETTER_SYSTEM, letterPrompt, type LetterFacts } from "@/lib/letter"
import { weeklyReview } from "@/lib/review"
import { bridgesFor, countInWeek, habitStreak, weekStart } from "@/lib/streaks"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validation"

/** Is the AI letter available on this deployment (an API key is configured)? */
export async function letterEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

/** Write (once a week) a short letter about the user's week with Claude, and keep it. */
export async function writeWeeklyLetter(): Promise<ActionResult> {
  const [{ t }, locale] = await Promise.all([getActionT(), getActionLocale()])
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: t.letter.unavailable }

  const data = await getDashboardData()
  const supabase = await createClient()
  const week = weekStart(data.today)

  const { data: existing } = await supabase.from("weekly_letters").select("week_start").eq("user_id", data.user.id).eq("week_start", week).maybeSingle()
  if (existing) return { ok: true }

  // aggregated facts only — habit names, counts, streaks, patterns, mood averages
  const habits = data.habits.filter((h) => !h.graduated_at)
  const byHabit = new Map<string, Set<ISODate>>(habits.map((h) => [h.id, new Set()]))
  for (const l of data.logs) byHabit.get(l.habit_id)?.add(l.log_date as ISODate)
  const input = habits.map((h) => ({
    id: h.id,
    name: h.name,
    target: h.target_per_week,
    createdOn: h.created_at.slice(0, 10) as ISODate,
    done: byHabit.get(h.id)!,
    hasPlan: Boolean(h.cue),
  }))
  const feelings = new Map(Object.entries(data.feelings) as [ISODate, DayFeeling][])
  const thisWeek = [...feelings].filter(([d]) => d >= week).map(([, f]) => f)
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null)
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
  }
  const review = weeklyReview(input, data.today)
  const facts: LetterFacts = {
    name: (data.profile?.display_name ?? "").split(" ")[0] ?? "",
    locale,
    habits: habits.map((h) => {
      const s = habitStreak(byHabit.get(h.id)!, data.today, h.target_per_week, bridgesFor(h.id, data.repairs, data.pauses))
      return {
        name: h.name,
        doneThisWeek: countInWeek(byHabit.get(h.id)!, week),
        target: h.target_per_week,
        streak: t.habit.streak(s.current, s.unit),
      }
    }),
    review: { rate: review.rate, previous: review.previous, top: review.top, behind: review.behind },
    insights: findInsights(input, data.today, 3, feelings),
    mood: { avg: avg(thisWeek.map((f) => f.mood)), energyAvg: avg(thisWeek.map((f) => f.energy)), days: thisWeek.length },
  }
  if (facts.habits.length === 0) return { ok: false, error: t.letter.noHabits }

  let body: string
  try {
    const client = new Anthropic()
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low" }, // a short letter — no deep reasoning needed
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // a safety decline is retried on a suitable model in the same call
      system: [{ type: "text", text: LETTER_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: letterPrompt(facts) }],
    })
    if (response.stop_reason === "refusal") return { ok: false, error: t.letter.failed }
    body = response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("\n")
      .trim()
    if (!body) return { ok: false, error: t.letter.failed }
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { ok: false, error: t.letter.busy }
    console.error("weekly letter failed", error instanceof Anthropic.APIError ? error.status : error)
    return { ok: false, error: t.letter.failed }
  }

  const { error } = await supabase.from("weekly_letters").insert({ week_start: week, locale, body: body.slice(0, 4000) })
  if (error && error.code !== "23505") return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}
