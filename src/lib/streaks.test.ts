import { describe, expect, it } from "vitest"

import { addDays, dateRange, diffDays, isISODate, todayIn, weekdayMon0 } from "./dates"
import {
  completionRate,
  currentStreak,
  currentWeeklyStreak,
  habitStreak,
  isDueToday,
  longestStreak,
  longestWeeklyStreak,
  weekStart,
} from "./streaks"

const set = (...d: string[]) => new Set(d)

describe("dates", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29")
  })
  it("diffs and ranges", () => {
    expect(diffDays("2026-11-01", "2026-11-24")).toBe(23)
    expect(dateRange("2026-11-22", "2026-11-24")).toEqual(["2026-11-22", "2026-11-23", "2026-11-24"])
  })
  it("validates ISO dates", () => {
    expect(isISODate("2026-02-28")).toBe(true)
    expect(isISODate("2026-02-30")).toBe(false)
    expect(isISODate("26-1-1")).toBe(false)
  })
  it("computes today in a timezone", () => {
    const now = new Date("2026-11-23T22:30:00Z")
    expect(todayIn("UTC", now)).toBe("2026-11-23")
    expect(todayIn("Asia/Dushanbe", now)).toBe("2026-11-24") // UTC+5
    expect(todayIn("America/New_York", now)).toBe("2026-11-23")
  })
  it("returns Monday-based weekday", () => {
    expect(weekdayMon0("2026-11-23")).toBe(0) // Monday
    expect(weekdayMon0("2026-11-29")).toBe(6) // Sunday
  })
})

describe("currentStreak", () => {
  const today = "2026-11-24"
  it("is 0 with no logs", () => expect(currentStreak(set(), today)).toBe(0))
  it("counts consecutive days ending today", () => {
    expect(currentStreak(set("2026-11-22", "2026-11-23", "2026-11-24"), today)).toBe(3)
  })
  it("stays alive if today is not done yet", () => {
    expect(currentStreak(set("2026-11-22", "2026-11-23"), today)).toBe(2)
  })
  it("breaks after a missed day", () => {
    expect(currentStreak(set("2026-11-20", "2026-11-21", "2026-11-23"), today)).toBe(1)
    expect(currentStreak(set("2026-11-21", "2026-11-22"), today)).toBe(0)
  })
})

describe("longestStreak", () => {
  it("finds the longest run", () => {
    expect(longestStreak(["2026-11-01", "2026-11-02", "2026-11-05", "2026-11-06", "2026-11-07"])).toBe(3)
  })
  it("ignores order and duplicates", () => {
    expect(longestStreak(["2026-11-03", "2026-11-01", "2026-11-02", "2026-11-02"])).toBe(3)
  })
  it("handles empty input", () => expect(longestStreak([])).toBe(0))
})

describe("completionRate", () => {
  it("counts only days since creation", () => {
    const done = set("2026-11-23", "2026-11-24")
    expect(completionRate(done, "2026-11-24", 30, "2026-11-21")).toBe(0.5)
  })
  it("uses the full window for older habits", () => {
    expect(completionRate(set("2026-11-24"), "2026-11-24", 10)).toBeCloseTo(0.1)
  })
})

describe("weekly targets", () => {
  // 2026-11-23 is a Monday
  const today = "2026-11-25" // Wednesday
  const w = (monday: string, ...offsets: number[]) => offsets.map((o) => addDays(monday, o))

  it("finds the Monday of a week", () => {
    expect(weekStart("2026-11-29")).toBe("2026-11-23")
    expect(weekStart("2026-11-23")).toBe("2026-11-23")
  })

  it("counts consecutive weeks that met the target", () => {
    const done = new Set([...w("2026-11-09", 0, 2, 4), ...w("2026-11-16", 1, 3, 5)])
    expect(currentWeeklyStreak(done, today, 3)).toBe(2) // this week in progress, doesn't break
    expect(currentWeeklyStreak(done, today, 4)).toBe(0)
  })

  it("counts the current week once the target is reached", () => {
    const done = new Set([...w("2026-11-16", 0, 1), ...w("2026-11-23", 0, 1)])
    expect(currentWeeklyStreak(done, today, 2)).toBe(2)
  })

  it("breaks on a missed week", () => {
    const done = new Set([...w("2026-11-02", 0, 1), ...w("2026-11-16", 0, 1)])
    expect(currentWeeklyStreak(done, today, 2)).toBe(1)
    expect(longestWeeklyStreak(done, 2)).toBe(1)
  })

  it("habitStreak picks days or weeks", () => {
    const done = new Set(["2026-11-24", "2026-11-25"])
    expect(habitStreak(done, today)).toEqual({ current: 2, best: 2, unit: "day" })
    expect(habitStreak(done, today, 2).unit).toBe("week")
  })

  it("is not due once the weekly target is met", () => {
    const done = new Set(["2026-11-23", "2026-11-24"])
    expect(isDueToday(done, today, 2)).toBe(false)
    expect(isDueToday(done, today, 3)).toBe(true)
    expect(isDueToday(done, today)).toBe(true)
  })

  it("scales completion rate by the target", () => {
    // 3×/week habit, 14 days, 6 check-ins = 100%
    const done = new Set(w("2026-11-12", 0, 2, 4, 6, 8, 10))
    expect(completionRate(done, "2026-11-25", 14, undefined, 3)).toBe(1)
  })
})
