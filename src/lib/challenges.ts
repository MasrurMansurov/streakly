import { diffDays, type ISODate } from "./dates"

export type ChallengeMember = {
  id: string
  isMe: boolean
  username: string
  name: string
  avatarUrl: string | null
  status: "invited" | "joined"
  habit: { name: string; color: string } | null
  score: number
  doneToday: boolean
  /** 1-based place among joined members (ties share a place) */
  place?: number
}

export type Challenge = {
  id: string
  title: string
  stake: string | null
  start: ISODate
  end: ISODate
  iOwn: boolean
  /** "invited" while I haven't accepted */
  myStatus: "invited" | "joined"
  phase: "upcoming" | "active" | "finished"
  daysLeft: number
  totalDays: number
  members: ChallengeMember[]
  /** finished challenges: who won and who honours the stake (lowest score, if it's a single person) */
  winners: ChallengeMember[]
  loser: ChallengeMember | null
}

export type ChallengeRow = {
  challenge_id: string
  title: string
  stake: string | null
  start_date: string
  end_date: string
  i_own: boolean
  member_id: string
  is_me: boolean
  username: string
  name: string
  avatar_url: string | null
  status: string
  habit_name: string | null
  habit_color: string | null
  score: number
  done_today: boolean
}

/** Groups my_challenges() rows into challenges with standings. */
export function buildChallenges(rows: ChallengeRow[], today: ISODate): Challenge[] {
  const byId = new Map<string, ChallengeRow[]>()
  for (const r of rows) byId.set(r.challenge_id, [...(byId.get(r.challenge_id) ?? []), r])

  return [...byId.values()].map((group) => {
    const c = group[0]
    const start = c.start_date as ISODate
    const end = c.end_date as ISODate
    const phase = today < start ? "upcoming" : today > end ? "finished" : "active"
    const members: ChallengeMember[] = group.map((r) => ({
      id: r.member_id,
      isMe: r.is_me,
      username: r.username,
      name: r.name,
      avatarUrl: r.avatar_url,
      status: r.status === "joined" ? "joined" : "invited",
      habit: r.habit_name ? { name: r.habit_name, color: r.habit_color ?? "emerald" } : null,
      score: r.score,
      doneToday: r.done_today,
    }))

    // standings: joined members by score, ties share a place; invitees last
    const joined = members.filter((m) => m.status === "joined").sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    joined.forEach((m, i) => (m.place = i > 0 && joined[i - 1].score === m.score ? joined[i - 1].place : i + 1))
    const ordered = [...joined, ...members.filter((m) => m.status === "invited")]

    const finished = phase === "finished" && joined.length >= 2
    const top = joined[0]?.score ?? 0
    const bottom = joined.at(-1)?.score ?? 0
    const lowest = joined.filter((m) => m.score === bottom)

    return {
      id: c.challenge_id,
      title: c.title,
      stake: c.stake,
      start,
      end,
      iOwn: c.i_own,
      myStatus: members.find((m) => m.isMe)?.status ?? "joined",
      phase,
      daysLeft: phase === "finished" ? 0 : diffDays(today < start ? start : today, end) + 1,
      totalDays: diffDays(start, end) + 1,
      members: ordered,
      winners: finished ? joined.filter((m) => m.score === top) : [],
      loser: finished && top !== bottom && lowest.length === 1 ? lowest[0] : null,
    }
  })
}
