/**
 * Ranks for the leaderboard (score over the last 30 days: check-ins + 2 × active days).
 * A user with one daily habit done every day scores 90; four such habits — 180.
 */
export const RANKS = [
  { key: "newcomer", min: 0, text: "text-zinc-500 dark:text-zinc-400", dot: "bg-zinc-400" },
  { key: "apprentice", min: 20, text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  { key: "practitioner", min: 50, text: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500" },
  { key: "expert", min: 90, text: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500" },
  { key: "master", min: 140, text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  { key: "grandmaster", min: 200, text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  { key: "legend", min: 280, text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
] as const

export type Rank = (typeof RANKS)[number]
export type RankKey = Rank["key"]

export function rankFor(score: number): Rank {
  let rank: Rank = RANKS[0]
  for (const r of RANKS) if (score >= r.min) rank = r
  return rank
}

/** The next rank and how many points are missing (null at the top). */
export function nextRank(score: number): { rank: Rank; missing: number } | null {
  const next = RANKS.find((r) => r.min > score)
  return next ? { rank: next, missing: next.min - score } : null
}
