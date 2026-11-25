/** Why streaks are paused. Streaks and reminders behave the same for every reason. */
export const PAUSE_REASONS = ["vacation", "sick", "rest"] as const
export type PauseReason = (typeof PAUSE_REASONS)[number]

export const asPauseReason = (value: unknown): PauseReason =>
  PAUSE_REASONS.includes(value as PauseReason) ? (value as PauseReason) : "vacation"
