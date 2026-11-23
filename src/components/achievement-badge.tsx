import { CheckIcon, FlameIcon, FootprintsIcon, LockIcon, type LucideIcon } from "lucide-react"

import type { AchievementId } from "@/lib/achievements"
import { cn } from "@/lib/utils"

type Style = {
  /** big number on the medal (or null for an icon-only medal) */
  value: string | null
  icon: LucideIcon
  /** outer metal rim and inner face gradients (full class names for Tailwind) */
  rim: string
  face: string
}

const STYLES: Record<AchievementId, Style> = {
  first_checkin: {
    value: null,
    icon: FootprintsIcon,
    rim: "from-emerald-200 via-emerald-400 to-emerald-700",
    face: "from-emerald-400 to-emerald-600",
  },
  streak_7: {
    value: "7",
    icon: FlameIcon,
    rim: "from-amber-100 via-amber-400 to-orange-700",
    face: "from-amber-400 to-orange-600",
  },
  streak_30: {
    value: "30",
    icon: FlameIcon,
    rim: "from-rose-200 via-rose-400 to-rose-700",
    face: "from-rose-400 to-red-600",
  },
  streak_100: {
    value: "100",
    icon: FlameIcon,
    rim: "from-violet-200 via-violet-400 to-violet-800",
    face: "from-violet-500 to-indigo-700",
  },
  checkins_100: {
    value: "100",
    icon: CheckIcon,
    rim: "from-sky-100 via-sky-400 to-sky-700",
    face: "from-sky-400 to-blue-600",
  },
  checkins_500: {
    value: "500",
    icon: CheckIcon,
    rim: "from-yellow-100 via-yellow-400 to-amber-700",
    face: "from-yellow-400 to-amber-600",
  },
}

type Props = { id: AchievementId; earned?: boolean; size?: number; className?: string }

/**
 * Medal-style achievement badge drawn with CSS: metallic rim, glossy face,
 * a number in the display font and a small line icon. Locked badges are grey.
 */
export function AchievementBadge({ id, earned = true, size = 56, className }: Props) {
  const s = STYLES[id]
  const Icon = s.icon
  const long = (s.value?.length ?? 0) >= 3

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 rounded-full bg-gradient-to-b p-[3px]",
        earned ? cn(s.rim, "shadow-[0_6px_14px_-6px_rgb(0_0_0/0.45)]") : "from-zinc-200 to-zinc-400 dark:from-zinc-600 dark:to-zinc-800",
        className
      )}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "relative flex size-full flex-col items-center justify-center overflow-hidden rounded-full bg-gradient-to-b",
          "shadow-[inset_0_2px_3px_rgb(255_255_255/0.35),inset_0_-3px_6px_rgb(0_0_0/0.25)]",
          earned ? s.face : "from-zinc-300 to-zinc-400 dark:from-zinc-700 dark:to-zinc-800"
        )}
      >
        {/* glossy highlight */}
        <span className="absolute inset-x-[18%] top-[5%] h-[36%] rounded-[50%] bg-gradient-to-b from-white/30 to-white/0" />
        {earned ? (
          s.value ? (
            <>
              <span
                className="relative font-heading leading-none font-bold text-white drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]"
                style={{ fontSize: size * (long ? 0.26 : 0.34) }}
              >
                {s.value}
              </span>
              <Icon
                className="relative mt-[3%] text-white/90"
                style={{ width: size * 0.2, height: size * 0.2 }}
                strokeWidth={2.5}
              />
            </>
          ) : (
            <Icon className="relative text-white drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]" style={{ width: size * 0.44, height: size * 0.44 }} strokeWidth={2.25} />
          )
        ) : (
          <LockIcon className="relative text-white/80 dark:text-zinc-400" style={{ width: size * 0.36, height: size * 0.36 }} strokeWidth={2.25} />
        )}
      </span>
    </span>
  )
}
