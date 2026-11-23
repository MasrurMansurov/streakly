import { describe, expect, it } from "vitest"

import { evaluateAchievements, newlyEarned } from "./achievements"

const earned = (stats: { totalCheckins: number; bestStreak: number }) =>
  evaluateAchievements(stats)
    .filter((a) => a.earned)
    .map((a) => a.id)

describe("achievements", () => {
  it("nothing for a new user", () => {
    expect(earned({ totalCheckins: 0, bestStreak: 0 })).toEqual([])
  })

  it("unlocks by total check-ins and best streak", () => {
    expect(earned({ totalCheckins: 1, bestStreak: 1 })).toEqual(["first_checkin"])
    expect(earned({ totalCheckins: 226, bestStreak: 23 })).toEqual(["first_checkin", "streak_7", "checkins_100"])
    expect(earned({ totalCheckins: 600, bestStreak: 120 })).toHaveLength(6)
  })

  it("caps progress at the target", () => {
    const streak30 = evaluateAchievements({ totalCheckins: 50, bestStreak: 45 }).find((a) => a.id === "streak_30")!
    expect(streak30).toEqual({ id: "streak_30", earned: true, current: 30, target: 30 })
    const streak100 = evaluateAchievements({ totalCheckins: 50, bestStreak: 45 }).find((a) => a.id === "streak_100")!
    expect(streak100.current).toBe(45)
  })

  it("detects newly earned achievements", () => {
    const before = evaluateAchievements({ totalCheckins: 99, bestStreak: 6 })
    const after = evaluateAchievements({ totalCheckins: 100, bestStreak: 7 })
    expect(newlyEarned(before, after)).toEqual(["streak_7", "checkins_100"])
    expect(newlyEarned(after, after)).toEqual([])
  })
})
