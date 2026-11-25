import { addDays, type ISODate } from "./dates"

/**
 * Comeback bonus (megastudy, Milkman et al. 2021): the best of 54 gym programs
 * rewarded coming back after a missed workout. Streaks and freezes *protect* a
 * run; this *rewards the return*.
 *
 * A comeback is a check-in on day `d` of a daily habit when the day before was
 * missed — not done and not bridged (vacation, repaired day) — and the habit
 * had been checked in before. A day saved by a streak freeze still counts as
 * missed here: the freeze kept the streak, the comeback is celebrated on top.
 * "Never miss twice": coming back the very next day after a single missed day.
 * Same rules as public.achievement_stats() in SQL.
 */
export function isComeback(done: ReadonlySet<ISODate>, day: ISODate, bridges: ReadonlySet<ISODate> = new Set()): boolean {
  const before = addDays(day, -1)
  if (done.has(before) || bridges.has(before)) return false
  for (const d of done) if (d < before) return true
  return false
}

/** Came back right after a single missed day (the day before the miss was done or bridged). */
export function isQuickComeback(done: ReadonlySet<ISODate>, day: ISODate, bridges: ReadonlySet<ISODate> = new Set()): boolean {
  const twoBefore = addDays(day, -2)
  return isComeback(done, day, bridges) && (done.has(twoBefore) || bridges.has(twoBefore))
}

/** All comebacks in a habit's history (checked-in days, oldest first). */
export function comebackDays(done: ReadonlySet<ISODate>, bridges: ReadonlySet<ISODate> = new Set()): ISODate[] {
  return [...done].sort().filter((d) => isComeback(done, d, bridges))
}

/** Was yesterday a miss you can come back from today? (used for the "come back today" nudge) */
export function canComeBackToday(done: ReadonlySet<ISODate>, today: ISODate, bridges: ReadonlySet<ISODate> = new Set()): boolean {
  if (done.has(today)) return false
  const withToday = new Set(done).add(today)
  return isComeback(withToday, today, bridges)
}
