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
 * a missed day is frozen when the day before was done (or bridged), the day after
 * is done/bridged (or is today, still open), and that month still has a freeze left.
 * Two misses in a row always break the streak ("never miss twice").
 * `bridges` are days that never break a streak on their own (vacation, repaired days).
 */
export function frozenDays(
  done: ReadonlySet<ISODate>,
  today: ISODate,
  perMonth = FREEZES_PER_MONTH,
  bridges: ReadonlySet<ISODate> = new Set()
): Set<ISODate> {
  const frozen = new Set<ISODate>()
  if (done.size === 0 || perMonth <= 0) return frozen
  const covered = (d: ISODate) => done.has(d) || bridges.has(d)
  const first = [...done].sort()[0]
  const used = new Map<string, number>()
  for (let d = addDays(first, 1); d < today; d = addDays(d, 1)) {
    if (covered(d)) continue
    const next = addDays(d, 1)
    if (!covered(addDays(d, -1)) || !(covered(next) || next === today)) continue
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

/** Current streak where gap days (frozen, paused, repaired) bridge but don't add to the count. */
export function currentStreakWithFreezes(done: ReadonlySet<ISODate>, gaps: ReadonlySet<ISODate>, today: ISODate): number {
  let day = done.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (done.has(day) || gaps.has(day)) {
    if (done.has(day)) streak++
    day = addDays(day, -1)
  }
  return streak
}

/** Longest run where gap days bridge. */
export function longestStreakWithFreezes(done: ReadonlySet<ISODate>, gaps: ReadonlySet<ISODate>): number {
  const days = [...new Set([...done, ...gaps])].sort()
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

/** Weekly streak where weeks touched by a bridge (vacation) never break it. */
function currentWeeklyStreakBridged(done: ReadonlySet<ISODate>, today: ISODate, target: Target, bridges: ReadonlySet<ISODate>): number {
  const touched = (monday: ISODate) => Array.from({ length: 7 }, (_, i) => addDays(monday, i)).some((d) => bridges.has(d))
  let week = weekStart(today)
  let streak = countInWeek(done, week) >= target ? 1 : 0
  week = addDays(week, -7)
  for (;;) {
    if (countInWeek(done, week) >= target) streak++
    else if (!touched(week)) break
    week = addDays(week, -7)
  }
  return streak
}

export type HabitStreak = {
  current: number
  best: number
  unit: "day" | "week"
  /** daily habits: forgiven missed days and how many were used this month */
  frozen?: Set<ISODate>
  freezesUsed?: number
}

/**
 * Streaks in days for daily habits (with freezes), in weeks for "N× per week" habits.
 * `bridges`: vacation days and repaired days — they keep a streak alive.
 */
export function habitStreak(
  done: ReadonlySet<ISODate>,
  today: ISODate,
  target: Target = DAILY,
  bridges: ReadonlySet<ISODate> = new Set()
): HabitStreak {
  if (target < DAILY) {
    return {
      current: bridges.size ? currentWeeklyStreakBridged(done, today, target, bridges) : currentWeeklyStreak(done, today, target),
      best: longestWeeklyStreak(done, target),
      unit: "week",
    }
  }
  const frozen = frozenDays(done, today, FREEZES_PER_MONTH, bridges)
  const gaps = new Set([...frozen, ...bridges])
  return {
    current: currentStreakWithFreezes(done, gaps, today),
    best: longestStreakWithFreezes(done, gaps),
    unit: "day",
    frozen,
    freezesUsed: freezesUsedThisMonth(frozen, today),
  }
}

/**
 * Can a broken daily streak be repaired? Looks at yesterday and the day before:
 * the day whose repair revives the longest streak (3+ days) wins. One repair per
 * habit per month (`repairedThisMonth`).
 */
export function repairCandidate(
  done: ReadonlySet<ISODate>,
  today: ISODate,
  bridges: ReadonlySet<ISODate>,
  repairedThisMonth: boolean
): { day: ISODate; streak: number } | null {
  if (repairedThisMonth) return null
  const now = habitStreak(done, today, DAILY, bridges).current
  let best: { day: ISODate; streak: number } | null = null
  for (const offset of [1, 2]) {
    const day = addDays(today, -offset)
    if (done.has(day) || bridges.has(day)) continue
    const streak = habitStreak(done, today, DAILY, new Set([...bridges, day])).current
    if (streak > now && streak >= 3 && (!best || streak > best.streak)) best = { day, streak }
  }
  return best
}

/** Days in [start, end] (inclusive) — used to turn pause ranges into bridge days. */
export function daysBetween(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
  return out
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

/** Bridge days for one habit: its repaired days plus every vacation day. */
export function bridgesFor(
  habitId: string,
  repairs: readonly { habit_id: string; day: ISODate }[],
  pauses: readonly { start_date: ISODate; end_date: ISODate }[]
): Set<ISODate> {
  const out = new Set<ISODate>(repairs.filter((r) => r.habit_id === habitId).map((r) => r.day))
  for (const p of pauses) for (const d of daysBetween(p.start_date, p.end_date)) out.add(d)
  return out
}
