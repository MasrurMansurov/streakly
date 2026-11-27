import { describe, expect, it } from "vitest"

import { addDays, weekdayMon0, type ISODate } from "./dates"
import { findInsights, type InsightHabit } from "./insights"

const today = "2026-11-25" as ISODate
const past = (pred: (d: ISODate, i: number) => boolean) => {
  const s = new Set<ISODate>()
  for (let i = 1; i <= 84; i++) {
    const d = addDays(today, -i)
    if (pred(d, i)) s.add(d)
  }
  return s
}
const habit = (name: string, done: Set<ISODate>, target = 7): InsightHabit => ({
  id: name,
  name,
  target,
  createdOn: "2026-01-01" as ISODate,
  done,
})

describe("findInsights", () => {
  it("finds habits that go together", () => {
    const run = past((_, i) => i % 2 === 0)
    const read = past((d, i) => run.has(d) || i % 7 === 1)
    const [first] = findInsights([habit("Run", run, 4), habit("Read", read)], today)
    expect(first).toMatchObject({ kind: "pair", a: "Run", b: "Read", withA: 1 })
    expect(first.kind === "pair" && first.withoutA).toBeLessThan(0.4)
  })

  it("finds a weak weekday", () => {
    const ts = habit("TypeScript", past((d) => weekdayMon0(d) !== 6))
    const insights = findInsights([ts], today)
    expect(insights).toContainEqual({ kind: "weekday", habit: "TypeScript", weekday: 6, rate: 0, others: 1 })
  })

  it("measures how often a miss is followed by a check-in", () => {
    // misses every 5th day, always back the next day
    const h = habit("Water", past((_, i) => i % 5 !== 0))
    const r = findInsights([h], today).find((x) => x.kind === "recovery")
    expect(r).toMatchObject({ kind: "recovery", rate: 1 })
  })

  it("suggests an if-then plan for a struggling habit without one", () => {
    const gym = habit("Gym", past((_, i) => i % 4 === 0)) // ~25%
    expect(findInsights([gym], today)).toContainEqual(expect.objectContaining({ kind: "plan", habit: "Gym" }))
    expect(findInsights([{ ...gym, hasPlan: true }], today).some((x) => x.kind === "plan")).toBe(false)
  })

  it("links a habit to better mood", () => {
    const run = past((_, i) => i % 2 === 0)
    const feelings = new Map<ISODate, { mood: number | null; energy: number | null }>()
    for (let i = 1; i <= 30; i++) {
      const d = addDays(today, -i)
      feelings.set(d, { mood: run.has(d) ? 4 : 3, energy: null })
    }
    const insight = findInsights([habit("Run", run)], today, 3, feelings).find((x) => x.kind === "mood")
    expect(insight).toMatchObject({ kind: "mood", habit: "Run", metric: "mood", withAvg: 4, withoutAvg: 3, nWith: 15, nWithout: 15 })
    // a few-times-a-week habit: its "without" days are simply off days — not compared on Progress
    expect(findInsights([habit("Run", run, 4)], today, 3, feelings).some((x) => x.kind === "mood")).toBe(false)
  })

  it("stays quiet without enough data", () => {
    const fresh = { ...habit("New", past((_, i) => i < 4)), createdOn: addDays(today, -4) }
    expect(findInsights([fresh], today)).toEqual([])
  })
})
