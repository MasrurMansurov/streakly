import { describe, expect, it } from "vitest"

import { dateRange, type ISODate } from "./dates"
import { buildWrapped, identityOf, wrappedText } from "./wrapped"

const set = (...ranges: [string, string][]) => new Set(ranges.flatMap(([a, b]) => dateRange(a, b)))

describe("year in review", () => {
  const read = { id: "r", name: "Read", color: "emerald", target: 7, done: set(["2025-12-20", "2025-12-31"], ["2026-01-01", "2026-01-10"], ["2026-03-01", "2026-03-31"]) }
  const run = { id: "w", name: "Run", color: "sky", target: 3, done: new Set<ISODate>(["2026-03-02", "2026-03-04", "2026-03-06", "2026-06-01"]) }
  const w = buildWrapped([read, run], 2026, "2026-11-26")

  it("counts only this year's check-ins", () => {
    expect(w.checkins).toBe(10 + 31 + 4)
    expect(w.activeDays).toBe(10 + 31 + 1) // March 2/4/6 overlap with Read
  })
  it("the best streak starts on Jan 1 at the earliest (December doesn't count)", () => {
    expect(w.bestStreak).toBe(31) // March
  })
  it("top habit, best month and weekday", () => {
    expect(w.topHabit).toEqual({ name: "Read", color: "emerald", checkins: 41 })
    expect(w.bestMonth).toEqual({ month: 3, checkins: 34 })
    expect(w.bestWeekday?.day).toBeGreaterThanOrEqual(0)
  })
  it("comebacks after a missed day (daily habits)", () => {
    expect(w.comebacks).toBe(1) // March 1 after the January gap
  })
  it("a long-time user gets the year, a newcomer their first N days", () => {
    expect(w.firstDays).toBeNull()
    const fresh = buildWrapped([{ ...read, done: set(["2026-11-01", "2026-11-26"]) }], 2026, "2026-11-26")
    expect(fresh.firstDays).toBe(26)
    expect(fresh.daysInRange).toBe(26)
  })
  it("an empty year has no highlights", () => {
    const empty = buildWrapped([], 2026, "2026-11-26")
    expect(empty).toMatchObject({ checkins: 0, topHabit: null, bestMonth: null, identity: "starter" })
  })
})

describe("identity", () => {
  const base = { bestStreak: 0, comebacks: 0, activeDays: 0, daysInRange: 0, hours: [] as number[] }
  it("is picked by priority", () => {
    expect(identityOf({ ...base, bestStreak: 45, comebacks: 9 })).toBe("marathoner")
    expect(identityOf({ ...base, comebacks: 6 })).toBe("comeback")
    expect(identityOf({ ...base, hours: Array(20).fill(7) })).toBe("earlyBird")
    expect(identityOf({ ...base, hours: Array(20).fill(23) })).toBe("nightOwl")
    expect(identityOf({ ...base, activeDays: 20, daysInRange: 30 })).toBe("steady")
    expect(identityOf(base)).toBe("starter")
  })
  it("needs enough check-ins to call someone an early bird", () => {
    expect(identityOf({ ...base, hours: Array(5).fill(7) })).toBe("starter")
  })
})

describe("share text", () => {
  it("has counts and a month bar, never habit names", () => {
    const w = buildWrapped([{ id: "r", name: "Secret habit", color: "emerald", target: 7, done: set(["2026-01-01", "2026-01-31"]) }], 2026, "2026-03-15")
    const text = wrappedText(w, { title: "Streakly 2026", checkins: "31 check-ins", streak: "31-day streak", url: "https://x" }, "2026-03-15")
    expect(text).not.toContain("Secret habit")
    const bar = text.split("\n")[2]
    expect([...bar.matchAll(/🟩|🟨|⬜|▫️/gu)].map((m) => m[0])).toEqual(["🟩", "⬜", "⬜", ...Array(9).fill("▫️")])
  })
})
