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

/** Streak freezes: single missed days forgiven per calendar month (daily habits only). */
export const FREEZES_PER_MONTH = 2

/**
 * Missed days that don't break a daily streak. Deterministic — nothing is stored:
 * a missed day is frozen when the day before was done, the day after is done (or is today, still open), and that month still has
 * a freeze left. Two misses in a row always break the streak ("never miss twice").
 */
export function frozenDays(done: ReadonlySet<ISODate>, today: ISODate, perMonth = FREEZES_PER_MONTH): Set<ISODate> {
  const frozen = new Set<ISODate>()
  if (done.size === 0 || perMonth <= 0) return frozen
  const first = [...done].sort()[0]
  const used = new Map<string, number>()
  for (let d = addDays(first, 1); d < today; d = addDays(d, 1)) {
    if (done.has(d)) continue
    const next = addDays(d, 1)
    if (!done.has(addDays(d, -1)) || !(done.has(next) || next === today)) continue
    const month = d.slice(0, 7)
    if ((used.get(month) ?? 0) >= perMonth) continue
    used.set(month, (used.get(month) ?? 0) + 1)
    frozen.add(d)
  }
  return frozen
}

/** Freezes used in the month of `today`. */
export function freezesUsedThisMonth(frozen: ReadonlySet<ISODate>, today: ISODate): number {
  return [...frozen].filter((d) => d.startsWith(today.slice(0, 7))).length
}

/** Current streak where frozen days bridge the gap (but don't add to the count). */
export function currentStreakWithFreezes(done: ReadonlySet<ISODate>, frozen: ReadonlySet<ISODate>, today: ISODate): number {
  let day = done.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (done.has(day) || frozen.has(day)) {
    if (done.has(day)) streak++
    day = addDays(day, -1)
  }
  return streak
}

/** Longest run where frozen days bridge gaps. */
export function longestStreakWithFreezes(done: ReadonlySet<ISODate>, frozen: ReadonlySet<ISODate>): number {
  const days = [...new Set([...done, ...frozen])].sort()
  let best = 0
  let run = 0
  let prev: ISODate | null = null
  for (const d of days) {
    if (prev === null || diffDays(prev, d) !== 1) run = 0
    if (done.has(d)) run++
    best = Math.max(best, run)
    prev = d
  }
  return best
}

export type HabitStreak = {
  current: number
  best: number
  unit: "day" | "week"
  /** daily habits: forgiven missed days and how many were used this month */
  frozen?: Set<ISODate>
  freezesUsed?: number
}

/** Streaks in days for daily habits (with freezes), in weeks for "N× per week" habits. */
export function habitStreak(done: ReadonlySet<ISODate>, today: ISODate, target: Target = DAILY): HabitStreak {
  if (target < DAILY) {
    return { current: currentWeeklyStreak(done, today, target), best: longestWeeklyStreak(done, target), unit: "week" }
  }
  const frozen = frozenDays(done, today)
  return {
    current: currentStreakWithFreezes(done, frozen, today),
    best: longestStreakWithFreezes(done, frozen),
    unit: "day",
    frozen,
    freezesUsed: freezesUsedThisMonth(frozen, today),
  }
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
