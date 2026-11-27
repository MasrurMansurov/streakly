import { describe, expect, it } from "vitest"

import { addDays, type ISODate } from "./dates"
import { seededRandom, type DayFeeling } from "./feeling-compare"
import { findInsights, type InsightHabit } from "./insights"

// The acceptance test from reports/Daybit и самочувствие в Streakly.md:
// with no real link between habits and mood, the Progress page must almost
// never claim one (the old rule did in ~56% of users with 8 habits).

const TODAY = "2026-11-30" as ISODate

/** A mood 1–5 with the shares 5/15/40/30/10 %. */
function drawMood(r: () => number): number {
  const x = r()
  return x < 0.05 ? 1 : x < 0.2 ? 2 : x < 0.6 ? 3 : x < 0.9 ? 4 : 5
}

function simulate(seed: string, habitsCount: number, effect: number, opts: { rate?: number; rated?: number } = {}) {
  const r = seededRandom(seed)
  const habits: InsightHabit[] = Array.from({ length: habitsCount }, (_, k) => ({
    id: `h${k}`,
    name: `Habit ${k}`,
    target: 7,
    createdOn: addDays(TODAY, -84),
    done: new Set<ISODate>(),
  }))
  const rates = habits.map(() => opts.rate ?? 0.4 + r() * 0.45) // 40–85 % of days unless fixed
  const feelings = new Map<ISODate, DayFeeling>()
  for (let i = 1; i <= 84; i++) {
    const d = addDays(TODAY, -i)
    habits.forEach((h, k) => r() < rates[k] && (h.done as Set<ISODate>).add(d))
    if (r() < (opts.rated ?? 0.6)) {
      // only habit 0 can carry a real effect
      const lift = effect && habits[0].done.has(d) ? effect : 0
      const mood = Math.min(5, Math.max(1, Math.round(drawMood(r) + lift)))
      feelings.set(d, { mood, energy: drawMood(r) })
    }
  }
  return findInsights(habits, TODAY, 3, feelings).filter((x) => x.kind === "mood")
}

describe("the mood pattern on Progress is honest", () => {
  it("no real link → a pattern in at most 5 % of people (8 habits, 60 % of days rated)", () => {
    const runs = 200
    let false_ = 0
    for (let s = 0; s < runs; s++) if (simulate(`null-${s}`, 8, 0).length > 0) false_++
    expect(false_ / runs).toBeLessThanOrEqual(0.05)
  }, 120_000)

  // the report's power check: +0.7 mood with about 30 days on each side
  // (fewer "without" days give an honest "early look", not a verdict)
  it("a real link still shows up: +0.7 mood, ~30 days with and ~30 without, 1 habit", () => {
    const runs = 60
    let found = 0
    for (let s = 0; s < runs; s++) {
      const hit = simulate(`real-${s}`, 1, 0.7, { rate: 0.5, rated: 0.72 })
      if (hit.length > 0 && hit[0].kind === "mood" && hit[0].habit === "Habit 0" && hit[0].withAvg > hit[0].withoutAvg) found++
    }
    expect(found / runs).toBeGreaterThanOrEqual(0.8)
  }, 120_000)

  it("private habits never surface", () => {
    const r = seededRandom("private")
    const done = new Set<ISODate>()
    const feelings = new Map<ISODate, DayFeeling>()
    for (let i = 1; i <= 84; i++) {
      const d = addDays(TODAY, -i)
      const on = r() < 0.5
      if (on) done.add(d)
      feelings.set(d, { mood: on ? 5 : 2, energy: 3 })
    }
    const h = { id: "p", name: "Secret", target: 7 as const, createdOn: addDays(TODAY, -84), done }
    expect(findInsights([{ ...h, isPrivate: false }], TODAY, 3, feelings).some((x) => x.kind === "mood")).toBe(true)
    expect(findInsights([{ ...h, isPrivate: true }], TODAY, 3, feelings).some((x) => x.kind === "mood")).toBe(false)
  })
})
