import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const TONES = {
  emerald: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-700 ring-amber-500/15 dark:text-amber-400",
  orange: "bg-orange-500/10 text-orange-700 ring-orange-500/15 dark:text-orange-400",
  sky: "bg-sky-500/10 text-sky-700 ring-sky-500/15 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-700 ring-violet-500/15 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-700 ring-rose-500/15 dark:text-rose-400",
  muted: "bg-muted text-muted-foreground ring-border",
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

/** The app's one icon style: a thin line icon on a soft tinted tile. */
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
