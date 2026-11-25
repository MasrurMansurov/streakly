import type { ISODate } from "./dates"
import { currentStreakWithFreezes, longestStreakWithFreezes } from "./streaks"

export type Pact = {
  id: string
  status: "pending" | "active"
  iInvited: boolean
  partner: { username: string; name: string; avatarUrl: string | null }
  myHabit: { id: string; name: string } | null
  partnerHabit: { name: string; color: string } | null
  partnerDates: ISODate[]
  /** vacation days of either person: they don't break the shared streak */
  pausedDays?: ISODate[]
  /** today's proofs; the partner's stays locked until I check in myself */
  proofs?: { mine: PactProof | null; partner: PactProof | null; partnerLocked: boolean }
}

export type PactProof = { note: string | null; photoUrl: string | null }

/**
 * The shared streak: only days on which BOTH people checked in count.
 * Vacation days of either person connect the streak without adding to it —
 * a partner's time off never breaks it for the other.
 */
export function duoStreak(
  mine: ReadonlySet<ISODate>,
  partner: ReadonlySet<ISODate>,
  today: ISODate,
  paused: ReadonlySet<ISODate> = new Set()
) {
  const both = new Set([...mine].filter((d) => partner.has(d)))
  const gaps = new Set([...paused].filter((d) => !both.has(d)))
  return {
    current: currentStreakWithFreezes(both, gaps, today),
    best: longestStreakWithFreezes(both, gaps),
    meToday: mine.has(today),
    partnerToday: partner.has(today),
  }
}
