import { describe, expect, it } from "vitest"

import { addDays, type ISODate } from "./dates"
import { weeklyReview, type ReviewHabit } from "./review"

// 2026-11-25 is a Wednesday → this week so far: Mon 23, Tue 24, Wed 25
const today = "2026-11-25" as ISODate
const days = (...offsets: number[]) => new Set(offsets.map((o) => addDays(today, o)))
const habit = (name: string, target: number, done: Set<ISODate>): ReviewHabit => ({
  id: name,
  name,
  target,
  createdOn: "2026-01-01" as ISODate,
  done,
})

describe("weeklyReview", () => {
  it("compares this week with the same days of last week", () => {
    const r = weeklyReview([habit("Read", 7, days(0, -1, -2, -7))], today)
    expect(r.rate).toBe(1) // Mon–Wed all done
    expect(r.previous).toBeCloseTo(1 / 3) // last Mon–Wed: only Wed
    expect(r.weeks).toHaveLength(8)
    expect(r.weeks.at(-1)!.rate).toBe(1)
  })

  it("finds the habit on a roll and the one falling behind", () => {
    const r = weeklyReview([habit("Read", 7, days(0, -1, -2)), habit("Run", 7, new Set()), habit("Gym", 3, days(-1))], today)
    expect(r.top).toEqual({ name: "Read", done: 3, target: 7 })
    expect(r.behind).toEqual({ name: "Run", done: 0, target: 7 })
  })

  it("still flags a lagging habit when nothing is done yet", () => {
    const r = weeklyReview([habit("Read", 7, new Set()), habit("Gym", 3, new Set())], today)
    expect(r.top).toBeNull()
    expect(r.behind).toEqual({ name: "Read", done: 0, target: 7 })
  })

  it("ignores days before a habit existed", () => {
    const h = { ...habit("New", 7, days(0)), createdOn: today }
    const r = weeklyReview([h], today)
    expect(r.rate).toBe(1)
    expect(r.previous).toBeNull()
  })
})
