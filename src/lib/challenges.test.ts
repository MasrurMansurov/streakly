import { describe, expect, it } from "vitest"

import type { ISODate } from "./dates"
import { buildChallenges, type ChallengeRow } from "./challenges"

const row = (member: string, score: number, extra: Partial<ChallengeRow> = {}): ChallengeRow => ({
  challenge_id: "c1",
  title: "Morning week",
  stake: "Loser buys coffee",
  start_date: "2026-11-23",
  end_date: "2026-11-29",
  i_own: true,
  member_id: member,
  is_me: member === "me",
  username: member,
  name: member,
  avatar_url: null,
  status: "joined",
  habit_name: "Run",
  habit_color: "sky",
  score,
  done_today: false,
  ...extra,
})

describe("buildChallenges", () => {
  it("ranks members, ties share a place, invitees go last", () => {
    const [c] = buildChallenges([row("me", 3), row("ann", 5), row("bob", 3), row("eve", 0, { status: "invited", habit_name: null })], "2026-11-25" as ISODate)
    expect(c.members.map((m) => [m.name, m.place])).toEqual([["ann", 1], ["bob", 2], ["me", 2], ["eve", undefined]])
    expect(c).toMatchObject({ phase: "active", daysLeft: 5, totalDays: 7, winners: [], loser: null })
  })

  it("names the winner and who honours the stake when it's over", () => {
    const [c] = buildChallenges([row("me", 6), row("ann", 4)], "2026-11-30" as ISODate)
    expect(c.phase).toBe("finished")
    expect(c.winners.map((m) => m.name)).toEqual(["me"])
    expect(c.loser?.name).toBe("ann")
  })

  it("no loser on a tie at the bottom", () => {
    const [c] = buildChallenges([row("me", 6), row("ann", 4), row("bob", 4)], "2026-11-30" as ISODate)
    expect(c.loser).toBeNull()
  })
})
