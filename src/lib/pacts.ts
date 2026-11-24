import type { ISODate } from "./dates"
import { currentStreak, longestStreak } from "./streaks"

export type Pact = {
  id: string
  status: "pending" | "active"
  iInvited: boolean
  partner: { username: string; name: string; avatarUrl: string | null }
  myHabit: { id: string; name: string } | null
  partnerHabit: { name: string; color: string } | null
  partnerDates: ISODate[]
}

/** The shared streak: only days on which BOTH people checked in count. */
export function duoStreak(mine: ReadonlySet<ISODate>, partner: ReadonlySet<ISODate>, today: ISODate) {
  const both = new Set([...mine].filter((d) => partner.has(d)))
  return {
    current: currentStreak(both, today),
    best: longestStreak(both),
    meToday: mine.has(today),
    partnerToday: partner.has(today),
  }
}
