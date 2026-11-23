export type AchievementStats = { totalCheckins: number; bestStreak: number }

export const ACHIEVEMENTS = [
  { id: "first_checkin", metric: "totalCheckins", target: 1 },
  { id: "streak_7", metric: "bestStreak", target: 7 },
  { id: "streak_30", metric: "bestStreak", target: 30 },
  { id: "streak_100", metric: "bestStreak", target: 100 },
  { id: "checkins_100", metric: "totalCheckins", target: 100 },
  { id: "checkins_500", metric: "totalCheckins", target: 500 },
] as const satisfies readonly { id: string; metric: keyof AchievementStats; target: number }[]

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"]

export type Achievement = { id: AchievementId; earned: boolean; current: number; target: number }

/** Every achievement with its progress, in display order. */
export function evaluateAchievements(stats: AchievementStats): Achievement[] {
  return ACHIEVEMENTS.map(({ id, metric, target }) => {
    const current = stats[metric]
    return { id, earned: current >= target, current: Math.min(current, target), target }
  })
}

/** Achievements earned in `next` that weren't earned in `prev`. */
export function newlyEarned(prev: Achievement[], next: Achievement[]): AchievementId[] {
  const before = new Set(prev.filter((a) => a.earned).map((a) => a.id))
  return next.filter((a) => a.earned && !before.has(a.id)).map((a) => a.id)
}
