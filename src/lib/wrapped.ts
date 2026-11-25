import { addDays, dateRange, diffDays, weekdayMon0, type ISODate } from "./dates"
import { comebackDays } from "./comeback"
import { habitStreak } from "./streaks"

/**
 * "Year in review" (growth plan 2.1): a personal recap worth sharing. Pure —
 * the page and the share image both compute it from the same input.
 */
export type WrappedHabit = {
  id: string
  name: string
  color: string
  target: number
  /** check-in dates (any year; only `year` counts) */
  done: ReadonlySet<ISODate>
  /** vacation / repaired days — they connect a streak */
  bridges?: ReadonlySet<ISODate>
}

export type Identity = "marathoner" | "comeback" | "earlyBird" | "nightOwl" | "steady" | "starter"

export type Wrapped = {
  year: number
  /** started this year less than 60 days ago → "your first N days" instead of the year */
  firstDays: number | null
  checkins: number
  activeDays: number
  /** days from the first check-in of the year (or Jan 1) up to `today` / Dec 31 */
  daysInRange: number
  bestStreak: number
  topHabit: { name: string; color: string; checkins: number } | null
  bestMonth: { month: number; checkins: number } | null
  /** 0 = Monday … 6 = Sunday */
  bestWeekday: { day: number; checkins: number } | null
  comebacks: number
  /** check-ins per day of the year (year in pixels) */
  perDay: Map<ISODate, number>
  identity: Identity
}

/** Local hour (0–23) of each check-in, when known (for early bird / night owl). */
export type CheckinHours = number[]

export function buildWrapped(habits: WrappedHabit[], year: number, today: ISODate, hours: CheckinHours = []): Wrapped {
  const start = `${year}-01-01` as ISODate
  const end = (today < `${year}-12-31` ? today : `${year}-12-31`) as ISODate
  const inYear = (d: ISODate) => d >= start && d <= end

  const perDay = new Map<ISODate, number>()
  const perMonth = Array.from({ length: 12 }, () => 0)
  const perWeekday = Array.from({ length: 7 }, () => 0)
  let checkins = 0
  let first: ISODate | null = null
  let top: Wrapped["topHabit"] = null
  let bestStreak = 0
  let comebacks = 0

  for (const h of habits) {
    const days = [...h.done].filter(inYear)
    for (const d of days) {
      perDay.set(d, (perDay.get(d) ?? 0) + 1)
      perMonth[Number(d.slice(5, 7)) - 1]++
      perWeekday[weekdayMon0(d)]++
      if (!first || d < first) first = d
    }
    checkins += days.length
    if (days.length > 0 && (!top || days.length > top.checkins)) top = { name: h.name, color: h.color, checkins: days.length }
    if (h.target >= 7) {
      const yearDone = new Set(days)
      const bridges = new Set([...(h.bridges ?? [])].filter(inYear))
      // the best run inside the year (a run from last December doesn't count)
      bestStreak = Math.max(bestStreak, habitStreak(yearDone, end, 7, bridges).best)
      comebacks += comebackDays(yearDone, bridges).length
    }
  }

  const activeDays = perDay.size
  const rangeStart = first && first > start ? first : start
  const daysInRange = first ? diffDays(rangeStart, end) + 1 : 0
  const firstDays = first && diffDays(first, end) + 1 < 60 ? diffDays(first, end) + 1 : null

  const maxIndex = (xs: number[]) => xs.reduce((best, v, i) => (v > xs[best] ? i : best), 0)
  const m = maxIndex(perMonth)
  const w = maxIndex(perWeekday)

  return {
    year,
    firstDays,
    checkins,
    activeDays,
    daysInRange,
    bestStreak,
    topHabit: top,
    bestMonth: checkins ? { month: m + 1, checkins: perMonth[m] } : null,
    bestWeekday: checkins ? { day: w, checkins: perWeekday[w] } : null,
    comebacks,
    perDay,
    identity: identityOf({ bestStreak, comebacks, activeDays, daysInRange, hours }),
  }
}

/** The one label that fits best — the order is the priority. */
export function identityOf(x: { bestStreak: number; comebacks: number; activeDays: number; daysInRange: number; hours: CheckinHours }): Identity {
  const early = x.hours.filter((h) => h >= 4 && h < 10).length
  const late = x.hours.filter((h) => h >= 21 || h < 4).length
  if (x.bestStreak >= 30) return "marathoner"
  if (x.comebacks >= 5) return "comeback"
  if (x.hours.length >= 20 && early / x.hours.length >= 0.5) return "earlyBird"
  if (x.hours.length >= 20 && late / x.hours.length >= 0.5) return "nightOwl"
  if (x.daysInRange >= 14 && x.activeDays / x.daysInRange >= 0.6) return "steady"
  return "starter"
}

/**
 * Wordle-style text to share: counts and a month-by-month bar, no habit names.
 * 🟩 ≥ 75% of days active, 🟨 ≥ 40%, ⬜ less, ▫️ month not reached yet.
 */
export function wrappedText(w: Wrapped, labels: { title: string; checkins: string; streak: string; url: string }, today: ISODate): string {
  const bar = Array.from({ length: 12 }, (_, i) => {
    const monthStart = `${w.year}-${String(i + 1).padStart(2, "0")}-01` as ISODate
    if (monthStart > today) return "▫️"
    const days = dateRange(monthStart, addDays(monthStart, 40)).filter((d) => d.slice(5, 7) === monthStart.slice(5, 7) && d <= today)
    if (days.length === 0) return "▫️"
    const active = days.filter((d) => (w.perDay.get(d) ?? 0) > 0).length / days.length
    return active >= 0.75 ? "🟩" : active >= 0.4 ? "🟨" : "⬜"
  }).join("")
  return [labels.title, `${labels.checkins} · ${labels.streak}`, bar, labels.url].join("\n")
}
