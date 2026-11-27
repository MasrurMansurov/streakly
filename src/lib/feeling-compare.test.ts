import { describe, expect, it } from "vitest"

import { addDays, weekdayMon0, type ISODate } from "./dates"
import { benjaminiYekutieli, cliffsDelta, compareFeeling, comparePairs, permutationP, seededRandom, type DayFeeling } from "./feeling-compare"

const TODAY = "2026-11-30" as ISODate // a Monday
const START = addDays(TODAY, -84)

/** Build a world: `isDone(day)` and `moodOf(day, done)` for the last 84 days. */
function world(isDone: (d: ISODate, i: number) => boolean, moodOf: (d: ISODate, done: boolean, i: number) => number | null) {
  const done = new Set<ISODate>()
  const feelings = new Map<ISODate, DayFeeling>()
  for (let i = 1; i <= 84; i++) {
    const d = addDays(TODAY, -i)
    const isOn = isDone(d, i)
    if (isOn) done.add(d)
    const m = moodOf(d, isOn, i)
    if (m !== null) feelings.set(d, { mood: m, energy: m })
  }
  return { done, feelings }
}

const base = { id: "h1", createdOn: START, today: TODAY, metric: "mood" as const, lag: 0 as const }

describe("compareFeeling — levels", () => {
  it("not enough data: says how many more days are needed on each side", () => {
    // done on every day but 3 → only 3 "without" days
    const { done, feelings } = world((_, i) => i > 3, () => 3)
    const r = compareFeeling({ ...base, done, feelings })
    expect(r.level).toBe("notEnough")
    if (r.level === "notEnough") {
      expect(r.nWithout).toBe(3)
      expect(r.needWithout).toBe(4)
      expect(r.needWith).toBe(0)
    }
  })

  it("an early look between 7 and 13 days on the smaller side, a verdict from 14", () => {
    // every 8th day without → 10 days, on varying weekdays
    const early = world((_, i) => i % 8 !== 0, () => 3)
    expect(compareFeeling({ ...base, ...early }).level).toBe("early")
    const later = world((_, i) => i % 2 === 0, (_, on) => (on ? 4 : 3))
    expect(compareFeeling({ ...base, ...later }).level).not.toBe("early")
  })

  it("a clear difference when it is real and large", () => {
    const { done, feelings } = world((_, i) => (i * 5) % 3 === 0 || i % 2 === 0, (_, on, i) => (on ? 4 : 3) + ((i * 7) % 3 === 0 ? 1 : 0) - ((i * 11) % 4 === 0 ? 1 : 0))
    const r = compareFeeling({ ...base, done, feelings })
    expect(r.level).toBe("clear")
    if (r.level === "clear") {
      expect(r.diff).toBeGreaterThan(0.5)
      expect(r.withAvg).toBeGreaterThan(r.withoutAvg)
    }
  })

  it("about the same when nothing changes", () => {
    const { done, feelings } = world((_, i) => i % 2 === 0, (_, __, i) => 3 + ((i * 7) % 3 === 0 ? 1 : 0))
    expect(compareFeeling({ ...base, done, feelings }).level).toBe("same")
  })

  it("a lower mood is reported as plainly as a higher one", () => {
    const { done, feelings } = world((_, i) => i % 2 === 0, (_, on, i) => (on ? 2 : 3) + ((i * 7) % 3 === 0 ? 1 : 0))
    const r = compareFeeling({ ...base, done, feelings })
    expect(r.level).toBe("clear")
    if (r.level === "clear") expect(r.diff).toBeLessThan(0)
  })
})

describe("compareFeeling — the traps", () => {
  it("a weekend effect is not credited to a weekend-only habit", () => {
    // done only on Saturdays; mood is +1 on weekends for everyone
    const { done, feelings } = world(
      (d) => weekdayMon0(d) === 5,
      (d) => (weekdayMon0(d) >= 5 ? 4 : 3)
    )
    const r = compareFeeling({ ...base, done, feelings })
    expect(["skewed", "notEnough"]).toContain(r.level)
  })

  it("a habit on mixed weekdays with a weekend mood lift: no false 'clear'", () => {
    // done on Sat, Sun and Wed; mood +1 on weekends only
    const { done, feelings } = world(
      (d) => [2, 5, 6].includes(weekdayMon0(d)) || weekdayMon0(d) === 0,
      (d) => (weekdayMon0(d) >= 5 ? 4 : 3)
    )
    const r = compareFeeling({ ...base, done, feelings })
    expect(r.level).not.toBe("clear")
  })

  it("a weekday-only habit: its 'without' days are mostly weekends — not a verdict on a handful of days", () => {
    // like the demo's walk: every weekday except a few; mood unrelated to it (pseudo-random)
    const { done, feelings } = world(
      (d, i) => weekdayMon0(d) <= 4 && i % 9 !== 4,
      (_, __, i) => 2 + ((i * 37 + 11) % 4)
    )
    const r = compareFeeling({ ...base, done, feelings })
    expect(["skewed", "early"]).toContain(r.level)
    if (r.level !== "notEnough") expect(r.nWithout).toBeLessThan(14) // counted on comparable weekdays only
  })

  it("paused and repaired days are left out, not counted as 'without'", () => {
    const { done, feelings } = world((_, i) => i % 2 === 0, () => 3)
    const excluded = new Set<ISODate>(Array.from({ length: 20 }, (_, k) => addDays(TODAY, -(2 * k + 1))))
    const all = comparePairs({ ...base, done, feelings })
    const kept = comparePairs({ ...base, done, feelings, excluded })
    expect(all.length - kept.length).toBe(20)
    expect(kept.every((p) => !excluded.has(p.day))).toBe(true)
  })

  it("next day: the habit day is matched with the next day's rating, today's rating never counts", () => {
    const done = new Set<ISODate>([addDays(TODAY, -2)])
    const feelings = new Map<ISODate, DayFeeling>([
      [addDays(TODAY, -1), { mood: 5, energy: 5 }],
      [TODAY, { mood: 1, energy: 1 }],
    ])
    const pairs = comparePairs({ ...base, lag: 1, done, feelings })
    expect(pairs).toEqual([{ day: addDays(TODAY, -2), weekday: weekdayMon0(addDays(TODAY, -2)), done: true, value: 5 }])
  })

  it("is deterministic: the same data gives the same interval", () => {
    const { done, feelings } = world((_, i) => i % 3 !== 0, (_, on, i) => (on ? 4 : 3) - (i % 5 === 0 ? 1 : 0))
    expect(compareFeeling({ ...base, done, feelings })).toEqual(compareFeeling({ ...base, done, feelings }))
  })
})

describe("helpers", () => {
  it("Cliff's delta", () => {
    expect(cliffsDelta([4, 4], [3, 3])).toBe(1)
    expect(cliffsDelta([3, 3], [3, 3])).toBe(0)
    expect(cliffsDelta([2], [3])).toBe(-1)
  })

  it("Benjamini–Yekutieli keeps strong results and drops weak ones", () => {
    expect([...benjaminiYekutieli([0.0001, 0.5, 0.9])]).toEqual([0])
    expect(benjaminiYekutieli([0.04, 0.05, 0.06]).size).toBe(0)
    expect(benjaminiYekutieli([]).size).toBe(0)
  })

  it("permutation p is small for a real link and large for none", () => {
    const real = world((_, i) => i % 2 === 0, (_, on, i) => (on ? 4 : 3) + ((i * 7) % 3 === 0 ? 1 : 0))
    const none = world((_, i) => i % 2 === 0, (_, __, i) => 3 + ((i * 7) % 3 === 0 ? 1 : 0))
    expect(permutationP({ ...base, ...real }, seededRandom("a"), 499)).toBeLessThan(0.01)
    expect(permutationP({ ...base, ...none }, seededRandom("a"), 499)).toBeGreaterThan(0.2)
  })
})
