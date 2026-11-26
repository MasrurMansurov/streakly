import { CheckIcon, FlameIcon, FootprintsIcon, RotateCcwIcon, type LucideIcon } from "lucide-react"

import type { AchievementId } from "@/lib/achievements"
import { cn } from "@/lib/utils"

type Style = {
  /** big number on the medal (or null for an icon-only medal) */
  value: string | null
  icon: LucideIcon
}

const STYLES: Record<AchievementId, Style> = {
  first_checkin: { value: null, icon: FootprintsIcon },
  streak_7: { value: "7", icon: FlameIcon },
  streak_30: { value: "30", icon: FlameIcon },
  streak_100: { value: "100", icon: FlameIcon },
  checkins_100: { value: "100", icon: CheckIcon },
  checkins_500: { value: "500", icon: CheckIcon },
  comeback: { value: null, icon: RotateCcwIcon },
  never_twice: { value: "×2", icon: RotateCcwIcon },
}

type Props = { id: AchievementId; earned?: boolean; size?: number; className?: string }

/**
 * One medal style for every achievement — the number does the talking, set in
 * the brand face, in the brand color, on a plain ring. Not yet earned: the same
 * medal as a dashed outline in muted ink (no lock, no per-medal rainbow).
 */
export function AchievementBadge({ id, earned = true, size = 56, className }: Props) {
  const s = STYLES[id]
  const Icon = s.icon
  const long = (s.value?.length ?? 0) >= 3

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 flex-col items-center justify-center rounded-full bg-card",
        earned ? "text-primary ring-[1.5px] ring-primary/45 ring-inset" : "border border-dashed border-muted-foreground/40 text-muted-foreground",
        className
      )}
      style={{ width: size, height: size }}
    >
      {s.value ? (
        <>
          <span className="font-brand leading-none font-semibold tabular-nums" style={{ fontSize: size * (long ? 0.24 : 0.32) }}>
            {s.value}
          </span>
          <Icon className="mt-[5%] opacity-70" style={{ width: size * 0.18, height: size * 0.18 }} strokeWidth={2.25} />
        </>
      ) : (
        <Icon style={{ width: size * 0.4, height: size * 0.4 }} strokeWidth={2} />
      )}
    </span>
  )
}
