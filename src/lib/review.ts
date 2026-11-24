import { addDays, diffDays, type ISODate } from "./dates"
import { countInWeek, weekStart, type Target } from "./streaks"

export type ReviewHabit = { id: string; name: string; target: Target; createdOn: ISODate; done: ReadonlySet<ISODate> }

/** Share of expected check-ins done in [from, to] across habits (weekly targets are prorated). */
function rateBetween(habits: ReviewHabit[], from: ISODate, to: ISODate): number | null {
  let expected = 0
  let hit = 0
  for (const h of habits) {
    const start = h.createdOn > from ? h.createdOn : from
    if (start > to) continue
    const days = diffDays(start, to) + 1
    const exp = (days * h.target) / 7
    let n = 0
    for (let d = start; d <= to; d = addDays(d, 1)) if (h.done.has(d)) n++
    expected += exp
    hit += Math.min(n, exp)
  }
  return expected > 0 ? hit / expected : null
}

export type WeeklyReview = {
  /** this week so far (Mon..today) */
  rate: number | null
  /** last week over the same days (Mon..same weekday), for a fair comparison */
  previous: number | null
  /** last 8 weeks, oldest first; the last one is the current (partial) week */
  weeks: { start: ISODate; rate: number | null }[]
  /** best progress towards this week's target */
  top: { name: string; done: number; target: number } | null
  /** furthest behind this week's pace (only if it is actually behind) */
  behind: { name: string; done: number; target: number } | null
}

export function weeklyReview(habits: ReviewHabit[], today: ISODate): WeeklyReview {
  const monday = weekStart(today)
  const elapsed = diffDays(monday, today) + 1 // 1..7
  const lastMonday = addDays(monday, -7)

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(monday, (i - 7) * 7)
    const end = i === 7 ? today : addDays(start, 6)
    return { start, rate: rateBetween(habits, start, end) }
  })

  // progress this week vs. the pace expected by today
  const progress = habits
    .filter((h) => h.createdOn <= monday)
    .map((h) => {
      const done = countInWeek(h.done, monday)
      const pace = (h.target * elapsed) / 7
      return { name: h.name, done, target: h.target, ratio: done / h.target, gap: pace - done }
    })
  const leader = [...progress].sort((a, b) => b.ratio - a.ratio || b.done - a.done)[0]
  const top = leader && leader.done > 0 ? { name: leader.name, done: leader.done, target: leader.target } : null
  const laggard = [...progress].filter((p) => p.name !== top?.name).sort((a, b) => b.gap - a.gap)[0]
  const behind = laggard && laggard.gap >= 1 ? { name: laggard.name, done: laggard.done, target: laggard.target } : null

  return {
    rate: rateBetween(habits, monday, today),
    previous: rateBetween(habits, lastMonday, addDays(lastMonday, elapsed - 1)),
    weeks,
    top,
    behind,
  }
}
