import { addDays, diffDays, weekdayMon0, type ISODate } from "./dates"

/** 7 = every day; 1–6 = N times per week */
export type Target = number

export const DAILY: Target = 7

/**
 * Current streak: consecutive completed days ending today.
 * If today isn't done yet the streak is still "alive" from yesterday.
 */
export function currentStreak(done: ReadonlySet<ISODate>, today: ISODate): number {
  let day = done.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (done.has(day)) {
    streak++
    day = addDays(day, -1)
  }
  return streak
}

/** Longest run of consecutive days in the set. */
export function longestStreak(done: Iterable<ISODate>): number {
  const sorted = [...new Set(done)].sort()
  let best = 0
  let run = 0
  let prev: ISODate | null = null
  for (const d of sorted) {
    run = prev !== null && diffDays(prev, d) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** Monday of the week containing `date`. */
export function weekStart(date: ISODate): ISODate {
  return addDays(date, -weekdayMon0(date))
}

/** Completions in the Monday-based week starting at `monday`. */
export function countInWeek(done: ReadonlySet<ISODate>, monday: ISODate): number {
  let n = 0
  for (let i = 0; i < 7; i++) if (done.has(addDays(monday, i))) n++
  return n
}

/**
 * Weekly streak: consecutive weeks where the target was reached.
 * The current week counts once reached, but never breaks the streak while in progress.
 */
export function currentWeeklyStreak(done: ReadonlySet<ISODate>, today: ISODate, target: Target): number {
  let week = weekStart(today)
  let streak = 0
  if (countInWeek(done, week) >= target) streak++
  week = addDays(week, -7)
  while (countInWeek(done, week) >= target) {
    streak++
    week = addDays(week, -7)
  }
  return streak
}

export function longestWeeklyStreak(done: ReadonlySet<ISODate>, target: Target): number {
  const weeks = new Map<ISODate, number>()
  for (const d of done) {
    const w = weekStart(d)
    weeks.set(w, (weeks.get(w) ?? 0) + 1)
  }
  const hit = [...weeks].filter(([, n]) => n >= target).map(([w]) => w).sort()
  let best = 0
  let run = 0
  let prev: ISODate | null = null
  for (const w of hit) {
    run = prev !== null && diffDays(prev, w) === 7 ? run + 1 : 1
    best = Math.max(best, run)
    prev = w
  }
  return best
}

export type HabitStreak = { current: number; best: number; unit: "day" | "week" }

/** Streaks in days for daily habits, in weeks for "N× per week" habits. */
export function habitStreak(done: ReadonlySet<ISODate>, today: ISODate, target: Target = DAILY): HabitStreak {
  return target >= DAILY
    ? { current: currentStreak(done, today), best: longestStreak(done), unit: "day" }
    : { current: currentWeeklyStreak(done, today, target), best: longestWeeklyStreak(done, target), unit: "week" }
}

export function formatStreak({ current, unit }: Pick<HabitStreak, "current" | "unit">): string {
  return unit === "day" ? `${current} day${current === 1 ? "" : "s"}` : `${current} wk${current === 1 ? "" : "s"}`
}

/** Is the habit still "due" today (not done today and weekly target not yet met)? */
export function isDueToday(done: ReadonlySet<ISODate>, today: ISODate, target: Target = DAILY): boolean {
  if (done.has(today)) return false
  return target >= DAILY || countInWeek(done, weekStart(today)) < target
}

/**
 * Share of the expected check-ins done in the last `days` days (including today),
 * counted only from the day the habit was created. For a weekly target of N,
 * N/7 check-ins are expected per day. Capped at 100%.
 */
export function completionRate(
  done: ReadonlySet<ISODate>,
  today: ISODate,
  days: number,
  createdOn?: ISODate,
  target: Target = DAILY
): number {
  let total = 0
  let hit = 0
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i)
    if (createdOn && d < createdOn) break
    total++
    if (done.has(d)) hit++
  }
  if (total === 0) return 0
  return Math.min(1, hit / ((total * Math.min(target, DAILY)) / DAILY))
}
