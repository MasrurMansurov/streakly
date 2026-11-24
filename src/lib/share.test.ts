import { describe, expect, it } from "vitest"

import type { ISODate } from "./dates"
import { emojiGrid, periodRange, summarize, type ShareHabit } from "./share"

const today = "2026-11-25" as ISODate // Wednesday
const h = (name: string, days: string[]): ShareHabit => ({ id: name, name, color: "emerald", target: 7, done: new Set(days as ISODate[]) })

describe("share card", () => {
  it("computes calendar periods", () => {
    expect(periodRange("week", today)).toEqual({ start: "2026-11-23", end: "2026-11-29" })
    expect(periodRange("month", today)).toEqual({ start: "2026-11-01", end: "2026-11-30" })
    expect(periodRange("month", "2028-02-10" as ISODate).end).toBe("2028-02-29")
    expect(periodRange("year", today)).toEqual({ start: "2026-01-01", end: "2026-12-31" })
  })

  it("summarizes a week", () => {
    const s = summarize([h("Read", ["2026-11-23", "2026-11-24", "2026-11-25"]), h("Run", ["2026-11-24", "2026-11-20"])], "week", today)
    expect(s).toMatchObject({ checkins: 4, activeDays: 3, daysSoFar: 3, longestRun: 3, topHabit: { name: "Read", checkins: 3 } })
    expect(s.streak).toEqual({ current: 3, unit: "day" })
  })

  it("draws a Wordle-style week", () => {
    const s = summarize([h("Read", ["2026-11-23", "2026-11-24"]), h("Run", ["2026-11-24"])], "week", today)
    expect(emojiGrid(s, "week", today)).toBe("🟨🟩⬜▫️▫️▫️▫️")
  })

  it("draws the year month by month", () => {
    const s = summarize([h("Read", ["2026-11-01", "2026-11-02"])], "year", today)
    const grid = emojiGrid(s, "year", today)
    expect([...grid.replace(/️/g, "")]).toHaveLength(12)
    expect(grid.startsWith("⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜🟧▫️")).toBe(true)
  })
})
