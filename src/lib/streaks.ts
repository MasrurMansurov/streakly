import { addDays, diffDays, type ISODate } from "./dates"

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

/**
 * Share of days completed in the last `days` days (including today),
 * counted only from the day the habit was created.
 */
export function completionRate(
  done: ReadonlySet<ISODate>,
  today: ISODate,
  days: number,
  createdOn?: ISODate
): number {
  let total = 0
  let hit = 0
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i)
    if (createdOn && d < createdOn) break
    total++
    if (done.has(d)) hit++
  }
  return total === 0 ? 0 : hit / total
}
