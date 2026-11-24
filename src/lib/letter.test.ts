import { describe, expect, it } from "vitest"

import { letterPrompt } from "./letter"

describe("letterPrompt", () => {
  it("passes only aggregated facts and the locale", () => {
    const prompt = letterPrompt({
      name: "Masrur",
      locale: "ru",
      habits: [{ name: "Read", doneThisWeek: 5, target: 7, streak: "12 дней" }],
      review: { rate: 0.71, previous: 0.86, top: { name: "Read", done: 5, target: 7 }, behind: null },
      insights: [{ kind: "recovery", rate: 0.68, slips: 12 }],
      mood: { avg: 3.8, energyAvg: null, days: 4 },
    })
    expect(prompt).toContain("locale: ru")
    expect(prompt).toContain('"thisWeekCompletion": "71%"')
    expect(prompt).toContain('"sameDaysLastWeek": "86%"')
    expect(prompt).not.toMatch(/\d{4}-\d{2}-\d{2}/) // no raw dates / logs
  })
})
