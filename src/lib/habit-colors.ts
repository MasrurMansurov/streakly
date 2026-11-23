/**
 * Habit color palette. Class names are written out in full so Tailwind can
 * detect them at build time (no string concatenation).
 */
export const HABIT_COLORS = {
  emerald: { dot: "bg-emerald-500", soft: "bg-emerald-500/15", ring: "ring-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  sky: { dot: "bg-sky-500", soft: "bg-sky-500/15", ring: "ring-sky-500", text: "text-sky-600 dark:text-sky-400" },
  violet: { dot: "bg-violet-500", soft: "bg-violet-500/15", ring: "ring-violet-500", text: "text-violet-600 dark:text-violet-400" },
  rose: { dot: "bg-rose-500", soft: "bg-rose-500/15", ring: "ring-rose-500", text: "text-rose-600 dark:text-rose-400" },
  amber: { dot: "bg-amber-500", soft: "bg-amber-500/15", ring: "ring-amber-500", text: "text-amber-600 dark:text-amber-400" },
  slate: { dot: "bg-slate-500", soft: "bg-slate-500/15", ring: "ring-slate-500", text: "text-slate-600 dark:text-slate-300" },
} as const

export type HabitColor = keyof typeof HABIT_COLORS

export const HABIT_COLOR_NAMES = Object.keys(HABIT_COLORS) as [HabitColor, ...HabitColor[]]

export function habitColor(color: string) {
  return HABIT_COLORS[(color in HABIT_COLORS ? color : "emerald") as HabitColor]
}
