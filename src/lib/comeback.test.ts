import { describe, expect, it } from "vitest"

import { dateRange, type ISODate } from "./dates"
import { canComeBackToday, comebackDays, isComeback, isQuickComeback } from "./comeback"

const set = (...d: ISODate[]) => new Set(d)

describe("comeback", () => {
  const done = set("2026-11-10", "2026-11-11", /* miss 12 */ "2026-11-13", /* miss 14, 15 */ "2026-11-16", "2026-11-17")

  it("a check-in after a missed day is a comeback", () => {
    expect(isComeback(done, "2026-11-13")).toBe(true)
    expect(isComeback(done, "2026-11-16")).toBe(true)
    expect(isComeback(done, "2026-11-11")).toBe(false) // the day before was done
    expect(isComeback(done, "2026-11-10")).toBe(false) // the very first check-in isn't a return
  })

  it("never miss twice = back the very next day after a single miss", () => {
    expect(isQuickComeback(done, "2026-11-13")).toBe(true)
    expect(isQuickComeback(done, "2026-11-16")).toBe(false) // two days missed
  })

  it("vacation and repaired days aren't misses", () => {
    expect(isComeback(done, "2026-11-13", set("2026-11-12"))).toBe(false)
    // returning after a vacation that ended the day before isn't a comeback either
    expect(isComeback(done, "2026-11-16", set("2026-11-14", "2026-11-15"))).toBe(false)
    // a miss right after the vacation, then back: quick comeback (the vacation day counts as covered)
    expect(isQuickComeback(set("2026-11-01", "2026-11-04"), "2026-11-04", set("2026-11-02"))).toBe(true)
  })

  it("lists every comeback in the history", () => {
    expect(comebackDays(done)).toEqual(["2026-11-13", "2026-11-16"])
    expect(comebackDays(new Set(dateRange("2026-11-01", "2026-11-20")))).toEqual([])
  })

  it("knows when today would be a comeback", () => {
    expect(canComeBackToday(set("2026-11-10"), "2026-11-12")).toBe(true) // 11th missed
    expect(canComeBackToday(set("2026-11-10", "2026-11-11"), "2026-11-12")).toBe(false) // nothing missed
    expect(canComeBackToday(set("2026-11-10", "2026-11-12"), "2026-11-12")).toBe(false) // already back
    expect(canComeBackToday(new Set(), "2026-11-12")).toBe(false) // a new habit
  })
})
