import { addDays, weekdayMon0, type ISODate } from "./dates"
import type { Target } from "./streaks"

export type InsightHabit = { id: string; name: string; target: Target; createdOn: ISODate; done: ReadonlySet<ISODate> }

export type Insight =
  /** doing `a` goes with doing `b` far more often */
  | { kind: "pair"; a: string; b: string; withA: number; withoutA: number }
  /** a daily habit that regularly slips on one weekday (0 = Monday) */
  | { kind: "weekday"; habit: string; weekday: number; rate: number; others: number }
  /** how often a missed day is followed by a check-in ("never miss twice") */
  | { kind: "recovery"; rate: number; slips: number }

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

function pairs(habits: InsightHabit[], today: ISODate): Extract<Insight, { kind: "pair" }>[] {
  const best = new Map<string, { insight: Extract<Insight, { kind: "pair" }>; score: number }>()
  for (const a of habits) {
    for (const b of habits) {
      if (a === b || b.target < 5) continue // "b" must be a near-daily habit, otherwise "not done" is expected
      const days = activeDays(a, today).filter((d) => d >= b.createdOn)
      const withA = days.filter((d) => a.done.has(d))
      const withoutA = days.filter((d) => !a.done.has(d))
      if (withA.length < MIN_SUPPORT || withoutA.length < MIN_SUPPORT) continue
      const pWith = withA.filter((d) => b.done.has(d)).length / withA.length
      const pWithout = withoutA.filter((d) => b.done.has(d)).length / withoutA.length
      const gap = pWith - pWithout
      if (gap < MIN_GAP) continue
      const score = gap * Math.sqrt(Math.min(withA.length, withoutA.length))
      const key = [a.id, b.id].sort().join("|")
      if ((best.get(key)?.score ?? -1) < score) {
        best.set(key, { insight: { kind: "pair", a: a.name, b: b.name, withA: pWith, withoutA: pWithout }, score })
      }
    }
  }
  return [...best.values()].sort((x, y) => y.score - x.score).map((x) => x.insight)
}

function weakWeekday(habits: InsightHabit[], today: ISODate): Extract<Insight, { kind: "weekday" }> | null {
  let found: Extract<Insight, { kind: "weekday" }> | null = null
  for (const h of habits) {
    if (h.target < 7) continue
    const total = Array(7).fill(0)
    const hit = Array(7).fill(0)
    for (const d of activeDays(h, today)) {
      const w = weekdayMon0(d)
      total[w]++
      if (h.done.has(d)) hit[w]++
    }
    if (total.some((n) => n < 4)) continue // need ~a month of data
    for (let w = 0; w < 7; w++) {
      const rate = hit[w] / total[w]
      const othersTotal = total.reduce((s, n, i) => (i === w ? s : s + n), 0)
      const others = hit.reduce((s, n, i) => (i === w ? s : s + n), 0) / othersTotal
      if (others - rate >= MIN_GAP && (!found || others - rate > found.others - found.rate)) {
        found = { kind: "weekday", habit: h.name, weekday: w, rate, others }
      }
    }
  }
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

/** Up to `limit` patterns found in the last 12 weeks, most useful first. */
export function findInsights(habits: InsightHabit[], today: ISODate, limit = 3): Insight[] {
  const p = pairs(habits, today)
  const w = weakWeekday(habits, today)
  const r = recovery(habits, today)
  const out: Insight[] = [...p.slice(0, 1), ...(w ? [w] : []), ...(r ? [r] : []), ...p.slice(1)]
  return out.slice(0, limit)
}
