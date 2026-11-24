import { diffDays, type ISODate } from "./dates"

/** Days it typically takes for a habit to become automatic (Lally et al., 2010). */
export const GRADUATION_DAYS = 66

export type StrengthInput = {
  createdOn: ISODate
  today: ISODate
  /** weekly self-reports, newest first (1–5) */
  scores: number[]
  /** share of the goal met over the last 28 days (0–1) */
  completion28: number
}

/**
 * Habit strength (0–100): how automatic it feels (latest self-report, 60%)
 * and how consistently it's done (last 4 weeks, 40%). Null before any report.
 */
export function habitStrength({ scores, completion28 }: Pick<StrengthInput, "scores" | "completion28">): number | null {
  if (scores.length === 0) return null
  const feel = (scores[0] - 1) / 4
  return Math.round((0.6 * feel + 0.4 * Math.min(1, Math.max(0, completion28))) * 100)
}

export type Graduation =
  | { ready: true }
  | { ready: false; daysLeft: number; needsFeel: boolean; needsConsistency: boolean }

/** Ready to graduate: 66+ days old, the last two reports 4+, and 80%+ of the goal over 4 weeks. */
export function graduation({ createdOn, today, scores, completion28 }: StrengthInput): Graduation {
  const age = diffDays(createdOn, today)
  const daysLeft = Math.max(0, GRADUATION_DAYS - age)
  const needsFeel = !(scores.length >= 2 && scores[0] >= 4 && scores[1] >= 4)
  const needsConsistency = completion28 < 0.8
  if (daysLeft === 0 && !needsFeel && !needsConsistency) return { ready: true }
  return { ready: false, daysLeft, needsFeel, needsConsistency }
}
