import type { ISODate } from "./dates"

export type QueuedToggle = { habitId: string; date: ISODate; done: boolean; mini?: boolean }
type Log = { habit_id: string; log_date: ISODate }

/** Last action per habit+day wins (check → uncheck → check is just "check"). */
export function enqueue(queue: QueuedToggle[], t: QueuedToggle): QueuedToggle[] {
  return [...queue.filter((q) => !(q.habitId === t.habitId && q.date === t.date)), t]
}

/** Server logs with the queued (not yet sent) toggles applied on top. */
export function applyQueue<L extends Log>(logs: L[], queue: QueuedToggle[], make: (t: QueuedToggle) => L): L[] {
  let out = logs
  for (const t of queue) {
    const has = out.some((l) => l.habit_id === t.habitId && l.log_date === t.date)
    // done: (re)place the log so a mini ↔ full switch is reflected too
    if (t.done) out = [...out.filter((l) => !(l.habit_id === t.habitId && l.log_date === t.date)), make(t)]
    if (!t.done && has) out = out.filter((l) => !(l.habit_id === t.habitId && l.log_date === t.date))
  }
  return out
}

export function loadQueue(key: string): QueuedToggle[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]")
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function saveQueue(key: string, queue: QueuedToggle[]) {
  try {
    if (queue.length) localStorage.setItem(key, JSON.stringify(queue))
    else localStorage.removeItem(key)
  } catch {
    // storage unavailable (private mode) — the queue lives in memory only
  }
}
