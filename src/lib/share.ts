import { addDays, diffDays, weekdayMon0, type ISODate } from "./dates"
import { habitStreak, longestStreak } from "./streaks"

export type SharePeriod = "week" | "month" | "year"
export const SHARE_PERIODS: SharePeriod[] = ["week", "month", "year"]

export type ShareHabit = { id: string; name: string; color: string; target: number; done: ReadonlySet<ISODate>; bridges?: ReadonlySet<ISODate> }

/** Calendar week (Mon–Sun), calendar month or calendar year containing `today`. */
export function periodRange(period: SharePeriod, today: ISODate): { start: ISODate; end: ISODate } {
  if (period === "week") {
    const start = addDays(today, -weekdayMon0(today))
    return { start, end: addDays(start, 6) }
  }
  if (period === "month") {
    const start = `${today.slice(0, 7)}-01` as ISODate
    const [y, m] = today.split("-").map(Number)
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) as ISODate
    return { start, end }
  }
  return { start: `${today.slice(0, 4)}-01-01` as ISODate, end: `${today.slice(0, 4)}-12-31` as ISODate }
}

export type ShareSummary = {
  start: ISODate
  end: ISODate
  /** days of the period up to today */
  daysSoFar: number
  checkins: number
  activeDays: number
  /** check-ins per day (for the grids) */
  perDay: Map<ISODate, number>
  /** best current streak across habits (days, or weeks for weekly habits) */
  streak: { current: number; unit: "day" | "week" }
  /** longest run of consecutive days on one habit inside the period */
  longestRun: number
  topHabit: { name: string; checkins: number } | null
  habits: number
}

export function summarize(habits: ShareHabit[], period: SharePeriod, today: ISODate): ShareSummary {
  const { start, end } = periodRange(period, today)
  const last = today < end ? today : end
  const perDay = new Map<ISODate, number>()
  let checkins = 0
  let longestRun = 0
  let topHabit: ShareSummary["topHabit"] = null
  for (const h of habits) {
    const inPeriod = [...h.done].filter((d) => d >= start && d <= last)
    checkins += inPeriod.length
    for (const d of inPeriod) perDay.set(d, (perDay.get(d) ?? 0) + 1)
    longestRun = Math.max(longestRun, longestStreak(inPeriod))
    if (inPeriod.length > (topHabit?.checkins ?? 0)) topHabit = { name: h.name, checkins: inPeriod.length }
  }
  const streaks = habits.map((h) => habitStreak(h.done, today, h.target, h.bridges))
  const best = streaks.sort((a, b) => (b.unit === "day" ? b.current : b.current * 7) - (a.unit === "day" ? a.current : a.current * 7))[0]
  return {
    start,
    end,
    daysSoFar: diffDays(start, last) + 1,
    checkins,
    activeDays: perDay.size,
    perDay,
    streak: best ? { current: best.current, unit: best.unit } : { current: 0, unit: "day" },
    longestRun,
    topHabit,
    habits: habits.length,
  }
}

/** Day level for grids: 0 none, 1 some, 2 all habits done. */
export function dayLevel(n: number, habits: number): 0 | 1 | 2 {
  if (n <= 0) return 0
  return n >= habits ? 2 : 1
}

/**
 * Wordle-style text: one emoji per day, weeks as rows (week/month) or a
 * month-by-month line (year). 🟩 all done · 🟨 some · ⬜ none · ▫️ not yet
 */
export function emojiGrid(summary: ShareSummary, period: SharePeriod, today: ISODate): string {
  const cell = (d: ISODate) => (d > today ? "▫️" : ["⬜", "🟨", "🟩"][dayLevel(summary.perDay.get(d) ?? 0, summary.habits)])
  if (period === "year") {
    // one square per month by share of active days
    const year = summary.start.slice(0, 4)
    return Array.from({ length: 12 }, (_, m) => {
      const first = `${year}-${String(m + 1).padStart(2, "0")}-01` as ISODate
      if (first > today) return "▫️"
      const { end } = periodRange("month", first)
      const days = diffDays(first, end < today ? end : today) + 1
      let active = 0
      for (let d = first; d <= end && d <= today; d = addDays(d, 1)) if (summary.perDay.has(d)) active++
      const share = active / days
      return share >= 0.8 ? "🟩" : share >= 0.4 ? "🟨" : share > 0 ? "🟧" : "⬜"
    }).join("")
  }
  // pad to Monday so rows are weeks
  const first = addDays(summary.start, -weekdayMon0(summary.start))
  const rows: string[] = []
  for (let w = first; w <= summary.end; w = addDays(w, 7)) {
    let row = ""
    for (let i = 0; i < 7; i++) {
      const d = addDays(w, i)
      row += d < summary.start || d > summary.end ? "　" : cell(d)
    }
    rows.push(row.replace(/　+$/, ""))
  }
  return rows.join("\n")
}
