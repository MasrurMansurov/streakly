import { describe, expect, it } from "vitest"

import type { ISODate } from "./dates"
import { duoStreak } from "./pacts"

const d = (...days: string[]) => new Set(days as ISODate[])

describe("duoStreak", () => {
  it("counts only days when both checked in", () => {
    const me = d("2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24")
    const partner = d("2026-11-21", "2026-11-22", "2026-11-23")
    const s = duoStreak(me, partner, "2026-11-24" as ISODate)
    // today only I checked in → the duo streak is still alive from yesterday
    expect(s).toEqual({ current: 3, best: 3, meToday: true, partnerToday: false })
  })

  it("breaks when one of you misses a day", () => {
    const me = d("2026-11-22", "2026-11-24")
    const partner = d("2026-11-22", "2026-11-23", "2026-11-24")
    expect(duoStreak(me, partner, "2026-11-24" as ISODate).current).toBe(1)
  })
})
