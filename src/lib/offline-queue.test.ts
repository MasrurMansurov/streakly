import { describe, expect, it } from "vitest"

import type { ISODate } from "./dates"
import { applyQueue, enqueue } from "./offline-queue"

const d = "2026-11-24" as ISODate
const make = (t: { habitId: string; date: ISODate }) => ({ habit_id: t.habitId, log_date: t.date })

describe("offline queue", () => {
  it("keeps only the last toggle per habit and day", () => {
    let q = enqueue([], { habitId: "a", date: d, done: true })
    q = enqueue(q, { habitId: "a", date: d, done: false })
    q = enqueue(q, { habitId: "b", date: d, done: true })
    expect(q).toEqual([
      { habitId: "a", date: d, done: false },
      { habitId: "b", date: d, done: true },
    ])
  })

  it("applies queued toggles over the server logs", () => {
    const logs = [{ habit_id: "a", log_date: d }]
    const out = applyQueue(logs, [{ habitId: "a", date: d, done: false }, { habitId: "b", date: d, done: true }], make)
    expect(out).toEqual([{ habit_id: "b", log_date: d }])
  })
})
