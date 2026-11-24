import { describe, expect, it } from "vitest"

import type { ISODate } from "./dates"
import { graduation, habitStrength } from "./strength"

describe("habit strength", () => {
  it("blends how automatic it feels with consistency", () => {
    expect(habitStrength({ scores: [], completion28: 1 })).toBeNull()
    expect(habitStrength({ scores: [5], completion28: 1 })).toBe(100)
    expect(habitStrength({ scores: [3], completion28: 0.5 })).toBe(50) // 0.6·0.5 + 0.4·0.5
    expect(habitStrength({ scores: [1], completion28: 0 })).toBe(0)
  })

  it("graduates after 66 days with two strong reports and 80% consistency", () => {
    const base = { createdOn: "2026-09-01" as ISODate, today: "2026-11-25" as ISODate }
    expect(graduation({ ...base, scores: [5, 4], completion28: 0.9 })).toEqual({ ready: true })
    expect(graduation({ ...base, scores: [5, 3], completion28: 0.9 })).toMatchObject({ ready: false, needsFeel: true })
    expect(graduation({ ...base, scores: [5, 5], completion28: 0.6 })).toMatchObject({ ready: false, needsConsistency: true })
    expect(graduation({ ...base, today: "2026-10-01" as ISODate, scores: [5, 5], completion28: 1 })).toMatchObject({ ready: false, daysLeft: 36 })
  })
})
