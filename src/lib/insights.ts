import { addDays, weekdayMon0, type ISODate } from "./dates"
import { compareFeeling, permutationP, type DayFeeling, type Metric } from "./feeling-compare"
import { benjaminiYekutieli, seededRandom, shuffle, weekdayAdjustedDiff, withinWeekdayPermutationP, type WeekdayRow } from "./stats"
import type { Target } from "./streaks"

export type { DayFeeling } from "./feeling-compare"

export type InsightHabit = {
  id: string
  name: string
  target: Target
  createdOn: ISODate
  done: ReadonlySet<ISODate>
  /** has an if-then plan (cue) */
  hasPlan?: boolean
  /** private habits never surface on their own in Progress */
  isPrivate?: boolean
  /** paused / repaired days — left out of the "how you felt" comparison */
  excluded?: ReadonlySet<ISODate>
}

export type Insight =
  /** doing `a` goes with doing `b` far more often */
  | { kind: "pair"; a: string; b: string; withA: number; withoutA: number }
  /** a daily habit that regularly slips on one weekday (0 = Monday) */
  | { kind: "weekday"; habit: string; weekday: number; rate: number; others: number }
  /** how often a missed day is followed by a check-in ("never miss twice") */
  | { kind: "recovery"; rate: number; slips: number }
  /** a habit that struggles and has no if-then plan yet */
  | { kind: "plan"; habitId: string; habit: string; rate: number }
  /**
   * mood/energy (1–5) was clearly different on days with this habit — higher or
   * lower, adjusted for weekdays, and still standing after the multiple-testing
   * correction (see moodLink)
   */
  | { kind: "mood"; habitId: string; habit: string; metric: Metric; withAvg: number; withoutAvg: number; nWith: number; nWithout: number }

export const INSIGHT_WINDOW = 84 // 12 weeks
const MIN_SUPPORT = 6 // days on each side of a comparison
const MIN_GAP = 0.25 // 25 percentage points

/** Days in the window (ending yesterday — today isn't over yet) on which the habit existed. */
function activeDays(h: InsightHabit, today: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let i = INSIGHT_WINDOW; i >= 1; i--) {
    const d = addDays(today, -i)
    if (d >= h.createdOn) out.push(d)
  }
  return out
}

/**
 * "Doing a goes with doing b": b's rate on days with a vs. without a, compared
 * within each weekday (two habits that both live on weekdays are linked by the
 * calendar, not by each other) and kept only if a permutation test survives the
 * Benjamini–Yekutieli correction across all pairs. Without this, independent
 * habits "went together" for ~28% of people, and calendar-bound ones always.
 */
function pairs(habits: InsightHabit[], today: ISODate): Extract<Insight, { kind: "pair" }>[] {
  const tests: { a: InsightHabit; b: InsightHabit; rows: WeekdayRow[]; pWith: number; pWithout: number; gap: number; n: number }[] = []
  for (const a of habits) {
    for (const b of habits) {
      if (a === b || b.target < 5 || a.isPrivate || b.isPrivate) continue // "b" must be near-daily, otherwise "not done" is expected
      const all = activeDays(a, today)
        .filter((d) => d >= b.createdOn && !a.excluded?.has(d) && !b.excluded?.has(d))
        .map((d) => ({ weekday: weekdayMon0(d), done: a.done.has(d), value: b.done.has(d) ? 1 : 0 }))
      // only weekdays with days both with and without a are comparable
      const on = new Set(all.filter((r) => r.done).map((r) => r.weekday))
      const off = new Set(all.filter((r) => !r.done).map((r) => r.weekday))
      const rows = all.filter((r) => on.has(r.weekday) && off.has(r.weekday))
      const withA = rows.filter((r) => r.done)
      const withoutA = rows.filter((r) => !r.done)
      if (withA.length < MIN_SUPPORT || withoutA.length < MIN_SUPPORT) continue
      const { diff } = weekdayAdjustedDiff(rows)
      tests.push({
        a,
        b,
        rows,
        pWith: withA.filter((r) => r.value).length / withA.length,
        pWithout: withoutA.filter((r) => r.value).length / withoutA.length,
        gap: Number.isFinite(diff) ? diff : 0,
        n: Math.min(withA.length, withoutA.length),
      })
    }
  }
  // the costly test only where the gap is big enough to show at all (the rest keep p = 1)
  const p = tests.map((x) => (x.gap >= MIN_GAP ? withinWeekdayPermutationP(x.rows, seededRandom(`${x.a.id}|${x.b.id}|${today}|pair`), { rounds: 999, alternative: "greater" }) : 1))
  const survivors = benjaminiYekutieli(p)
  const best = new Map<string, { insight: Extract<Insight, { kind: "pair" }>; score: number }>()
  tests.forEach((x, i) => {
    if (!survivors.has(i) || x.gap < MIN_GAP) return
    const score = x.gap * Math.sqrt(x.n)
    const key = [x.a.id, x.b.id].sort().join("|")
    if ((best.get(key)?.score ?? -1) < score) {
      best.set(key, { insight: { kind: "pair", a: x.a.name, b: x.b.name, withA: x.pWith, withoutA: x.pWithout }, score })
    }
  })
  return [...best.values()].sort((x, y) => y.score - x.score).map((x) => x.insight)
}

/**
 * A daily habit that slips on one weekday. The weakest of seven weekdays always
 * looks weak by chance (this fired for ~80% of people whose habits don't depend
 * on the weekday at all), so the test asks: is the gap between the weakest
 * weekday and the rest bigger than shuffling the habit's days around would give?
 * Then the Benjamini–Yekutieli correction across habits.
 */
function weakWeekday(habits: InsightHabit[], today: ISODate): Extract<Insight, { kind: "weekday" }> | null {
  const worst = (days: readonly ISODate[], done: readonly boolean[]) => {
    const total = Array(7).fill(0)
    const hit = Array(7).fill(0)
    days.forEach((d, i) => {
      const w = weekdayMon0(d)
      total[w]++
      if (done[i]) hit[w]++
    })
    let best = { weekday: 0, rate: 0, others: 0, gap: -Infinity }
    for (let w = 0; w < 7; w++) {
      const othersTotal = total.reduce((s, n, i) => (i === w ? s : s + n), 0)
      const rate = hit[w] / total[w]
      const others = hit.reduce((s, n, i) => (i === w ? s : s + n), 0) / othersTotal
      if (others - rate > best.gap) best = { weekday: w, rate, others, gap: others - rate }
    }
    return { ...best, total }
  }

  const tests = habits
    .filter((h) => h.target >= 7 && !h.isPrivate)
    .map((h) => {
      const days = activeDays(h, today).filter((d) => !h.excluded?.has(d))
      const done = days.map((d) => h.done.has(d))
      return { h, days, done, observed: worst(days, done) }
    })
    .filter((x) => x.observed.total.every((n: number) => n >= 4)) // ~a month of every weekday
  const p = tests.map((x) => {
    if (x.observed.gap < MIN_GAP) return 1
    const random = seededRandom(`${x.h.id}|${today}|weekday`)
    const rounds = 999
    let atLeast = 0
    for (let k = 0; k < rounds; k++) if (worst(x.days, shuffle(x.done.slice(), random)).gap >= x.observed.gap - 1e-12) atLeast++
    return (atLeast + 1) / (rounds + 1)
  })
  const survivors = benjaminiYekutieli(p)
  let found: Extract<Insight, { kind: "weekday" }> | null = null
  tests.forEach((x, i) => {
    const o = x.observed
    if (!survivors.has(i) || o.gap < MIN_GAP) return
    if (!found || o.gap > found.others - found.rate) found = { kind: "weekday", habit: x.h.name, weekday: o.weekday, rate: o.rate, others: o.others }
  })
  return found
}

function recovery(habits: InsightHabit[], today: ISODate): Extract<Insight, { kind: "recovery" }> | null {
  let slips = 0
  let recovered = 0
  for (const h of habits) {
    if (h.target < 7) continue
    const days = activeDays(h, today)
    // a slip: done → missed; recovered if the next day is done
    for (let i = 1; i < days.length - 1; i++) {
      if (h.done.has(days[i - 1]) && !h.done.has(days[i])) {
        slips++
        if (h.done.has(days[i + 1])) recovered++
      }
    }
  }
  return slips >= 5 ? { kind: "recovery", rate: recovered / slips, slips } : null
}

/** The weakest habit (under 60% of its target over the last 4 weeks) that has no if-then plan. */
function needsPlan(habits: InsightHabit[], today: ISODate): Extract<Insight, { kind: "plan" }> | null {
  let found: Extract<Insight, { kind: "plan" }> | null = null
  for (const h of habits) {
    if (h.hasPlan || h.createdOn > addDays(today, -14)) continue
    let days = 0
    let hits = 0
    for (let i = 1; i <= 28; i++) {
      const d = addDays(today, -i)
      if (d < h.createdOn) break
      days++
      if (h.done.has(d)) hits++
    }
    const rate = Math.min(1, hits / ((days * h.target) / 7))
    if (rate < 0.6 && (!found || rate < found.rate)) found = { kind: "plan", habitId: h.id, habit: h.name, rate }
  }
  return found
}

/**
 * At most one clear "how you felt" pattern. Every near-daily, non-private habit
 * is compared for mood and for energy (same day, adjusted for weekdays); a
 * pattern is shown only if it is "clear" on its own AND survives a permutation
 * test (shuffling the habit's days within each weekday) with the
 * Benjamini–Yekutieli correction across all those comparisons. Without the
 * correction, picking the biggest of many noisy gaps "finds" something in
 * about half of all users with no real link at all.
 */
function moodLink(habits: InsightHabit[], feelings: ReadonlyMap<ISODate, DayFeeling>, today: ISODate) {
  if (feelings.size === 0) return null
  const tests = habits
    .filter((h) => h.target >= 5 && !h.isPrivate)
    .flatMap((h) =>
      (["mood", "energy"] as const).map((metric) => {
        const input = { id: h.id, createdOn: h.createdOn, done: h.done, feelings, today, excluded: h.excluded, metric, lag: 0 as const }
        return { h, metric, input, result: compareFeeling(input) }
      })
    )
  // the permutation test only for candidates that could be shown anyway (a costly
  // test for the rest would change nothing: they keep p = 1, which is conservative)
  const p = tests.map((t) =>
    t.result.level === "clear" ? permutationP(t.input, seededRandom(`${t.h.id}|${t.metric}|${today}|perm`)) : 1
  )
  const survivors = benjaminiYekutieli(p)
  let best: Extract<Insight, { kind: "mood" }> | null = null
  let bestGap = 0
  tests.forEach((t, i) => {
    const r = t.result
    if (!survivors.has(i) || r.level !== "clear") return
    if (Math.abs(r.diff) <= bestGap) return
    bestGap = Math.abs(r.diff)
    best = { kind: "mood", habitId: t.h.id, habit: t.h.name, metric: t.metric, withAvg: r.withAvg, withoutAvg: r.withoutAvg, nWith: r.nWith, nWithout: r.nWithout }
  })
  return best
}

/** Up to `limit` patterns found in the last 12 weeks, most useful first. */
export function findInsights(
  habits: InsightHabit[],
  today: ISODate,
  limit = 3,
  feelings: ReadonlyMap<ISODate, DayFeeling> = new Map()
): Insight[] {
  const p = pairs(habits, today)
  const w = weakWeekday(habits, today)
  const r = recovery(habits, today)
  const plan = needsPlan(habits, today)
  const mood = moodLink(habits, feelings, today)
  const out: Insight[] = [...(mood ? [mood] : []), ...p.slice(0, 1), ...(plan ? [plan] : []), ...(w ? [w] : []), ...(r ? [r] : []), ...p.slice(1)]
  return out.slice(0, limit)
}
