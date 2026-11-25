import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * One calm style for every tile: a neutral surface and a quiet line icon.
 * Tones are kept in the API (call sites say what an icon is about), but they
 * no longer paint the UI in pastel — color is reserved for habits and state.
 */
const NEUTRAL = "bg-muted/70 text-foreground/70 ring-border/60"
const TONES = {
  emerald: NEUTRAL,
  amber: NEUTRAL,
  orange: NEUTRAL,
  sky: NEUTRAL,
  violet: NEUTRAL,
  rose: NEUTRAL,
  muted: NEUTRAL,
} as const

const SIZES = {
  sm: { box: "size-8 rounded-lg", icon: "size-4" },
  md: { box: "size-10 rounded-xl", icon: "size-5" },
  lg: { box: "size-14 rounded-2xl", icon: "size-7" },
} as const

export type IconTone = keyof typeof TONES

type Props = {
  icon: LucideIcon
  tone?: IconTone
  size?: keyof typeof SIZES
  className?: string
  iconClassName?: string
}

/** The app's one icon style: a thin line icon on a neutral tile. */
export function IconTile({ icon: Icon, tone = "emerald", size = "md", className, iconClassName }: Props) {
  const s = SIZES[size]
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center ring-1 ring-inset", s.box, TONES[tone], className)}
    >
      <Icon className={cn(s.icon, iconClassName)} strokeWidth={1.75} />
    </span>
  )
}
