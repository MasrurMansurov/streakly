import { describe, expect, it } from "vitest"

import { addDays, dateRange, diffDays, isISODate, todayIn, weekdayMon0 } from "./dates"
import {
  frozenDays,
  repairCandidate,
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
    expect(habitStreak(done, today)).toMatchObject({ current: 2, best: 2, unit: "day", freezesUsed: 0 })
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

describe("streak freezes", () => {
  const today = "2026-11-24"
  it("a single missed day doesn't break a daily streak", () => {
    const done = set("2026-11-20", "2026-11-21", "2026-11-23", "2026-11-24") // 22nd missed
    expect(habitStreak(done, today)).toMatchObject({ current: 4, best: 4, freezesUsed: 1 })
  })
  it("yesterday's miss is bridged while today is still open", () => {
    const done = set("2026-11-21", "2026-11-22") // 23rd missed, today not yet
    expect(habitStreak(done, today).current).toBe(2)
  })
  it("two misses in a row break it", () => {
    const done = set("2026-11-19", "2026-11-20", "2026-11-23", "2026-11-24")
    expect(habitStreak(done, today).current).toBe(2)
  })
  it("allows at most two freezes per month", () => {
    const done = set("2026-11-01", "2026-11-03", "2026-11-05", "2026-11-07", "2026-11-08")
    const frozen = frozenDays(done, today)
    expect([...frozen].sort()).toEqual(["2026-11-02", "2026-11-04"])
    expect(habitStreak(done, today).best).toBe(3) // 05, (06 not frozen) → 07, 08 … best run: 01,03,05 = 3
  })
  it("weekly habits don't use freezes", () => {
    expect(habitStreak(set("2026-11-23"), today, 3).frozen).toBeUndefined()
  })
})

describe("streak repair and vacation", () => {
  const today = "2026-11-24"
  const run = (from: string, to: string) => {
    const out = new Set<string>()
    for (let d = from; d <= to; d = addDays(d, 1)) out.add(d)
    return out
  }

  it("repairs yesterday when the month's freezes are used up", () => {
    // freezes for November already spent on the 3rd and 5th; the 23rd missed
    const done = new Set([...run("2026-11-01", "2026-11-02"), "2026-11-04", ...run("2026-11-06", "2026-11-22")])
    expect(habitStreak(done, today).current).toBe(0)
    expect(repairCandidate(done, today, new Set(), false)).toEqual({ day: "2026-11-23", streak: 20 })
  })

  it("two misses: one repair + a freeze revive the streak", () => {
    const done = run("2026-11-10", "2026-11-21") // 22nd and 23rd missed
    expect(habitStreak(done, today).current).toBe(0)
    // repairing yesterday lets a freeze cover the 22nd
    expect(repairCandidate(done, today, new Set(), false)).toEqual({ day: "2026-11-23", streak: 12 })
  })

  it("is limited to once a month", () => {
    const done = run("2026-11-10", "2026-11-21")
    expect(repairCandidate(done, today, new Set(), true)).toBeNull()
  })

  it("vacation days bridge daily and weekly streaks", () => {
    const done = new Set([...run("2026-11-01", "2026-11-10"), ...run("2026-11-20", "2026-11-24")])
    const pause = new Set(run("2026-11-11", "2026-11-19"))
    expect(habitStreak(done, today).current).toBe(5)
    expect(habitStreak(done, today, 7, pause).current).toBe(15)
    // weekly 3×: the week of the 16th wasn't hit but was on vacation
    const weekly = new Set(["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-23", "2026-11-24", "2026-11-25"])
    expect(habitStreak(weekly, today, 3).current).toBe(1)
    expect(habitStreak(weekly, today, 3, run("2026-11-16", "2026-11-22")).current).toBe(3)
  })
})

/**
 * The same fixture is checked against public.achievement_stats() in SQL —
 * "best streak" must be the same number everywhere (see migration
 * 20261125001100_best_streak_with_bridges.sql).
 */
describe("best streak: freezes, vacation and repairs (shared fixture with SQL)", () => {
  const range = (a: string, b: string) => dateRange(a, b)
  const done = new Set([
    ...range("2026-09-01", "2026-09-10"), // miss 09-11 → freeze 1
    ...range("2026-09-12", "2026-09-16"), // miss 09-17 → freeze 2
    ...range("2026-09-18", "2026-09-20"), // miss 09-21 → no freezes left in September: run ends (18)
    ...range("2026-09-22", "2026-09-30"),
    // vacation 10-01 … 10-05
    ...range("2026-10-06", "2026-10-20"),
    // 10-21 repaired, 10-22 missed → freeze (October still has 2)
    ...range("2026-10-23", "2026-10-25"),
  ])
  const bridges = new Set([...range("2026-10-01", "2026-10-05"), "2026-10-21"])

  it("daily habit: 9 + 15 + 3 = 27 days, plain consecutive days only 15", () => {
    expect(habitStreak(done, "2026-11-25", 7, bridges).best).toBe(27)
    expect(longestStreak(done)).toBe(15)
  })

  it("current streak matches public.habit_current_streak(): 27, then a freeze, then broken", () => {
    expect(habitStreak(done, "2026-10-26", 7, bridges).current).toBe(27)
    expect(habitStreak(done, "2026-10-27", 7, bridges).current).toBe(27) // yesterday missed: frozen
    expect(habitStreak(done, "2026-10-28", 7, bridges).current).toBe(0) // two misses in a row
  })
})

describe("weekly habits and vacation", () => {
  it("the best weekly streak bridges vacation weeks, like the current one", () => {
    // 2×/week: weeks of 11-02 and 11-09 hit, vacation week 11-16, week of 11-23 hit
    const done = new Set(["2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11", "2026-11-23", "2026-11-25"])
    const bridges = new Set(dateRange("2026-11-16", "2026-11-22"))
    const s = habitStreak(done, "2026-11-25", 2, bridges)
    expect(s.current).toBe(3)
    expect(s.best).toBe(3)
    expect(habitStreak(done, "2026-11-25", 2).best).toBe(2) // without the vacation: 2 weeks, then a break
  })
})

describe("completion rate ignores vacation and repaired days", () => {
  it("a week of vacation doesn't lower the rate", () => {
    const done = new Set(dateRange("2026-11-01", "2026-11-14"))
    const vacation = new Set(dateRange("2026-11-15", "2026-11-21"))
    expect(completionRate(done, "2026-11-21", 21, "2026-11-01", 7)).toBeCloseTo(14 / 21)
    expect(completionRate(done, "2026-11-21", 21, "2026-11-01", 7, vacation)).toBe(1)
  })
  it("a check-in on a vacation day still counts", () => {
    const done = new Set(["2026-11-20"])
    const vacation = new Set(["2026-11-20", "2026-11-21"])
    expect(completionRate(done, "2026-11-21", 2, undefined, 7, vacation)).toBe(1)
  })
})
