import { addDays, weekdayMon0, type ISODate } from "./dates"
import { seededRandom, weekdayAdjustedDiff, withinWeekdayPermutationP } from "./stats"

export { benjaminiYekutieli, seededRandom } from "./stats"

/**
 * "How you felt on days with vs. without a habit" — an honest n-of-1 comparison.
 * One function, one set of rules, used by the habit page and by the Progress
 * insight. See reports/Daybit и самочувствие в Streakly.md for the reasoning.
 *
 *  - Days: the last 12 weeks, ending yesterday, from the habit's first day.
 *    Paused and repaired days are left out (they are neither "with" nor "without").
 *  - Lag 0: the rating of the same day. Lag 1: the rating of the next day
 *    (only if that day is before today — today isn't over).
 *  - Weekdays: the difference is measured within each weekday and then averaged,
 *    so "I run on Saturdays and Saturdays are nicer anyway" doesn't count. Only
 *    weekdays that have both kinds of day are comparable — the day counts, the
 *    thresholds and the averages all use those days only (a weekday-only habit
 *    has its "without" days mostly on weekends, which compare with nothing).
 *  - Levels by the smaller group: < 7 days → not enough; 7–13 → early look;
 *    14+ → a verdict: clear (the 90% interval excludes 0 and |Cliff's δ| ≥ 0.33),
 *    about the same (the interval inside ±0.3), or unclear.
 *  - Deterministic: the bootstrap uses a seeded generator, so the numbers don't
 *    jump between visits.
 */

export type Metric = "mood" | "energy"
export type Lag = 0 | 1
export type DayFeeling = { mood: number | null; energy: number | null }

export const COMPARE_WINDOW = 84
export const MIN_DAYS = 7
export const VERDICT_DAYS = 14
const MIN_WEEKDAYS = 4
const SAME_BAND = 0.3
const CLEAR_CLIFF = 0.33
const BOOTSTRAP = 1000

export type CompareInput = {
  /** used for the random seed */
  id: string
  createdOn: ISODate
  done: ReadonlySet<ISODate>
  feelings: ReadonlyMap<ISODate, DayFeeling>
  today: ISODate
  /** paused / repaired days: not compared */
  excluded?: ReadonlySet<ISODate>
  metric: Metric
  lag: Lag
}

type Pair = { day: ISODate; weekday: number; done: boolean; value: number }

export type FeelingComparison =
  | { level: "notEnough"; nWith: number; nWithout: number; needWith: number; needWithout: number }
  | { level: "skewed"; nWith: number; nWithout: number }
  | {
      level: "early" | "clear" | "unclear" | "same"
      nWith: number
      nWithout: number
      /** display averages: the overall level of the raw data, the gap adjusted for weekdays */
      withAvg: number
      withoutAvg: number
      /** with − without, adjusted for weekdays */
      diff: number
      /** 90% block-bootstrap interval of `diff` */
      interval: [number, number]
      /** Cliff's delta on the raw ratings, −1…1 */
      cliff: number
    }

/** The (habit day, rating) pairs the comparison is made of, oldest first. */
export function comparePairs(input: Omit<CompareInput, "id">): Pair[] {
  const { createdOn, done, feelings, today, excluded, metric, lag } = input
  const out: Pair[] = []
  for (let i = COMPARE_WINDOW; i >= 1; i--) {
    const day = addDays(today, -i)
    if (day < createdOn || excluded?.has(day)) continue
    const rated = addDays(day, lag)
    if (rated >= today) continue
    const value = feelings.get(rated)?.[metric]
    if (value == null) continue
    out.push({ day, weekday: weekdayMon0(day), done: done.has(day), value })
  }
  return out
}

function mean(xs: readonly number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length
}

/** Cliff's delta: P(with > without) − P(with < without). */
export function cliffsDelta(withValues: readonly number[], withoutValues: readonly number[]): number {
  let gt = 0
  let lt = 0
  for (const x of withValues) {
    for (const y of withoutValues) {
      if (x > y) gt++
      else if (x < y) lt++
    }
  }
  return (gt - lt) / (withValues.length * withoutValues.length)
}

/** 90% percentile interval of the weekday-adjusted difference, resampling whole weeks. */
function blockBootstrap(pairs: readonly Pair[], random: () => number, rounds = BOOTSTRAP): [number, number] {
  const blocks: Pair[][] = []
  for (let i = 0; i < pairs.length; i += 7) blocks.push(pairs.slice(i, i + 7))
  const diffs: number[] = []
  for (let r = 0; r < rounds; r++) {
    const sample: Pair[] = []
    for (let b = 0; b < blocks.length; b++) sample.push(...blocks[Math.floor(random() * blocks.length)])
    const { diff } = weekdayAdjustedDiff(sample)
    if (Number.isFinite(diff)) diffs.push(diff)
  }
  if (diffs.length < rounds / 2) return [-Infinity, Infinity] // too unstable to say anything
  diffs.sort((x, y) => x - y)
  const at = (q: number) => diffs[Math.min(diffs.length - 1, Math.max(0, Math.floor(q * diffs.length)))]
  return [at(0.05), at(0.95)]
}

const round1 = (x: number) => Math.round(x * 10) / 10

export function compareFeeling(input: CompareInput, options: { rounds?: number } = {}): FeelingComparison {
  const all = comparePairs(input)
  const rawWith = all.filter((p) => p.done).length
  const rawWithout = all.length - rawWith
  if (Math.min(rawWith, rawWithout) < MIN_DAYS) {
    return {
      level: "notEnough",
      nWith: rawWith,
      nWithout: rawWithout,
      needWith: Math.max(0, MIN_DAYS - rawWith),
      needWithout: Math.max(0, MIN_DAYS - rawWithout),
    }
  }

  // only weekdays with both kinds of day can be compared
  const hasWith = new Set(all.filter((p) => p.done).map((p) => p.weekday))
  const hasWithout = new Set(all.filter((p) => !p.done).map((p) => p.weekday))
  const pairs = all.filter((p) => hasWith.has(p.weekday) && hasWithout.has(p.weekday))
  const withValues = pairs.filter((p) => p.done).map((p) => p.value)
  const withoutValues = pairs.filter((p) => !p.done).map((p) => p.value)
  const nWith = withValues.length
  const nWithout = withoutValues.length

  const { diff, weekdays } = weekdayAdjustedDiff(pairs)
  // enough days overall, but not on comparable weekdays: the habit sits on the same days of the week
  if (weekdays < MIN_WEEKDAYS || !Number.isFinite(diff) || Math.min(nWith, nWithout) < MIN_DAYS) {
    return { level: "skewed", nWith, nWithout }
  }

  const random = seededRandom(`${input.id}|${input.metric}|${input.lag}|${input.today}`)
  const interval = blockBootstrap(pairs, random, options.rounds)
  const cliff = cliffsDelta(withValues, withoutValues)
  const mid = (mean(withValues) + mean(withoutValues)) / 2
  const level =
    Math.min(nWith, nWithout) < VERDICT_DAYS
      ? "early"
      : (interval[0] > 0 || interval[1] < 0) && Math.abs(cliff) >= CLEAR_CLIFF
        ? "clear"
        : interval[0] >= -SAME_BAND && interval[1] <= SAME_BAND
          ? "same"
          : "unclear"

  return {
    level,
    nWith,
    nWithout,
    withAvg: round1(mid + diff / 2),
    withoutAvg: round1(mid - diff / 2),
    diff,
    interval,
    cliff,
  }
}

/**
 * Permutation p-value for the weekday-adjusted difference: the habit's days are
 * shuffled within each weekday (the weekday pattern stays, only the habit link
 * is broken). Two-sided.
 */
export function permutationP(input: Omit<CompareInput, "id">, random: () => number, rounds = 1999): number {
  return withinWeekdayPermutationP(comparePairs(input), random, { rounds, alternative: "two-sided" })
}
