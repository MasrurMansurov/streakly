import { CheckIcon, FlameIcon, FootprintsIcon, LockIcon, RotateCcwIcon, type LucideIcon } from "lucide-react"

import type { AchievementId } from "@/lib/achievements"
import { cn } from "@/lib/utils"

type Style = {
  /** big number on the medal (or null for an icon-only medal) */
  value: string | null
  icon: LucideIcon
  /** flat tint, text and ring colors (full class names for Tailwind) */
  tone: string
}

const STYLES: Record<AchievementId, Style> = {
  first_checkin: {
    value: null,
    icon: FootprintsIcon,
    tone: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  },
  streak_7: {
    value: "7",
    icon: FlameIcon,
    tone: "bg-amber-500/12 text-amber-700 ring-amber-500/30 dark:text-amber-300",
  },
  streak_30: {
    value: "30",
    icon: FlameIcon,
    tone: "bg-rose-500/12 text-rose-700 ring-rose-500/30 dark:text-rose-300",
  },
  streak_100: {
    value: "100",
    icon: FlameIcon,
    tone: "bg-violet-500/12 text-violet-700 ring-violet-500/30 dark:text-violet-300",
  },
  checkins_100: {
    value: "100",
    icon: CheckIcon,
    tone: "bg-sky-500/12 text-sky-700 ring-sky-500/30 dark:text-sky-300",
  },
  checkins_500: {
    value: "500",
    icon: CheckIcon,
    tone: "bg-yellow-500/12 text-yellow-700 ring-yellow-500/30 dark:text-yellow-300",
  },
  comeback: {
    value: null,
    icon: RotateCcwIcon,
    tone: "bg-teal-500/12 text-teal-700 ring-teal-500/30 dark:text-teal-300",
  },
  never_twice: {
    value: "×2",
    icon: RotateCcwIcon,
    tone: "bg-fuchsia-500/12 text-fuchsia-700 ring-fuchsia-500/30 dark:text-fuchsia-300",
  },
}

type Props = { id: AchievementId; earned?: boolean; size?: number; className?: string }

/**
 * Flat achievement badge: a tinted circle with a thin ring, the number (or an
 * icon) in the badge's color. Locked badges are neutral with a lock.
 */
export function AchievementBadge({ id, earned = true, size = 56, className }: Props) {
  const s = STYLES[id]
  const Icon = s.icon
  const long = (s.value?.length ?? 0) >= 3

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 flex-col items-center justify-center rounded-full ring-1 ring-inset",
        earned ? s.tone : "bg-muted text-muted-foreground ring-border",
        className
      )}
      style={{ width: size, height: size }}
    >
      {!earned ? (
        <LockIcon style={{ width: size * 0.34, height: size * 0.34 }} strokeWidth={2} />
      ) : s.value ? (
        <>
          <span className="leading-none font-semibold tracking-tight" style={{ fontSize: size * (long ? 0.27 : 0.34) }}>
            {s.value}
          </span>
          <Icon className="mt-[4%] opacity-80" style={{ width: size * 0.2, height: size * 0.2 }} strokeWidth={2.25} />
        </>
      ) : (
        <Icon style={{ width: size * 0.42, height: size * 0.42 }} strokeWidth={2} />
      )}
    </span>
  )
}
