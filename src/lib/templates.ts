import {
  BookOpenIcon,
  BrainIcon,
  DropletIcon,
  DumbbellIcon,
  FootprintsIcon,
  LanguagesIcon,
  MoonStarIcon,
  PenLineIcon,
  type LucideIcon,
} from "lucide-react"

import type { HabitColor } from "./habit-colors"

/** Starter habits shown to new users; names/descriptions live in the dictionaries (t.templates). */
export const HABIT_TEMPLATES = [
  { key: "water", icon: DropletIcon, color: "sky", target: 7 },
  { key: "read", icon: BookOpenIcon, color: "emerald", target: 7 },
  { key: "walk", icon: FootprintsIcon, color: "amber", target: 7 },
  { key: "workout", icon: DumbbellIcon, color: "rose", target: 3 },
  { key: "meditate", icon: BrainIcon, color: "violet", target: 7 },
  { key: "sleep", icon: MoonStarIcon, color: "slate", target: 7 },
  { key: "language", icon: LanguagesIcon, color: "sky", target: 5 },
  { key: "journal", icon: PenLineIcon, color: "amber", target: 7 },
] as const satisfies readonly { key: string; icon: LucideIcon; color: HabitColor; target: number }[]

export type TemplateKey = (typeof HABIT_TEMPLATES)[number]["key"]
