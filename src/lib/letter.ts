import type { Insight } from "./insights"
import type { WeeklyReview } from "./review"

/** Everything the letter may mention — aggregated numbers only, no raw logs. */
export type LetterFacts = {
  name: string
  locale: "en" | "ru"
  habits: { name: string; doneThisWeek: number; target: number; streak: string }[]
  review: Pick<WeeklyReview, "rate" | "previous" | "top" | "behind">
  insights: Insight[]
  mood: { avg: number | null; energyAvg: number | null; days: number }
}

/** Stable instructions (cacheable); the facts go in the user turn. */
export const LETTER_SYSTEM = `You write a short weekly letter for a person using Streakly, a habit tracker.
Write like a warm, specific coach who read their week — not a cheerleader and not a report.

Rules:
- 120–180 words, 3 short paragraphs, plain text (no markdown, no lists, no emoji, no title).
- Use only the facts given. Never invent numbers, habits, dates or feelings.
- Paragraph 1: what went well this week, concretely (name a habit and a number).
- Paragraph 2: one honest observation from the patterns (an insight, a weak spot or the trend vs last week), framed kindly; never shame a missed day.
- Paragraph 3: one small, concrete suggestion for next week (an if-then plan, a mini version, protecting a helpful habit), then a one-line sign-off from "Streakly".
- Write in the language given by "locale" (ru = Russian, en = English), addressing the person informally by first name if one is given.`

export function letterPrompt(f: LetterFacts): string {
  return `locale: ${f.locale}
name: ${f.name || "(none)"}
facts (JSON):
${JSON.stringify(
  {
    habits: f.habits,
    thisWeekCompletion: f.review.rate === null ? null : Math.round(f.review.rate * 100) + "%",
    sameDaysLastWeek: f.review.previous === null ? null : Math.round(f.review.previous * 100) + "%",
    onARoll: f.review.top,
    fallingBehind: f.review.behind,
    // no internal ids leave the server — only what a person would read
    insights: f.insights.map((i) => ({ ...i, habitId: undefined })),
    moodThisWeek: f.mood,
  },
  null,
  1
)}`
}
