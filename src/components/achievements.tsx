import { LockIcon } from "lucide-react"

import { Icon3D, type Icon3DName } from "@/components/icon-3d"
import { getDictionary, type Locale } from "@/i18n"
import type { Achievement, AchievementId } from "@/lib/achievements"
import { cn } from "@/lib/utils"

/** 3D icon and progress color per badge (full class names so Tailwind picks them up). */
export const BADGES: Record<AchievementId, { icon: Icon3DName; glow: string; bar: string }> = {
  first_checkin: { icon: "sparkles", glow: "bg-emerald-400/25", bar: "bg-emerald-500" },
  streak_7: { icon: "fire", glow: "bg-amber-400/25", bar: "bg-amber-500" },
  streak_30: { icon: "lightning", glow: "bg-yellow-400/25", bar: "bg-orange-500" },
  streak_100: { icon: "crown", glow: "bg-violet-400/25", bar: "bg-violet-500" },
  checkins_100: { icon: "medal", glow: "bg-sky-400/25", bar: "bg-sky-500" },
  checkins_500: { icon: "trophy", glow: "bg-rose-400/25", bar: "bg-rose-500" },
}

type Props = {
  achievements: Achievement[]
  locale: Locale
  /** public profile: show earned badges only */
  earnedOnly?: boolean
  className?: string
}

/** Badge grid. Works in Server and Client Components (no hooks). */
export function Achievements({ achievements, locale, earnedOnly, className }: Props) {
  const t = getDictionary(locale).achievements
  const list = earnedOnly ? achievements.filter((a) => a.earned) : achievements

  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {list.map((a) => {
        const badge = BADGES[a.id]
        const item = t.items[a.id]
        return (
          <li
            key={a.id}
            className={cn(
              "group flex items-center gap-3 rounded-xl border p-3 transition-all duration-300",
              a.earned ? "hover:-translate-y-0.5 hover:shadow-md" : "bg-muted/40"
            )}
            aria-label={`${item.name}: ${a.earned ? t.earned : t.progress(a.current, a.target)}`}
          >
            <span className="relative flex size-16 shrink-0 items-center justify-center">
              {a.earned && <span aria-hidden className={cn("absolute inset-1 rounded-full blur-md", badge.glow)} />}
              <Icon3D
                name={badge.icon}
                size={60}
                className={cn(
                  "relative transition-transform duration-300",
                  a.earned
                    ? "group-hover:scale-110 group-hover:-rotate-8 motion-safe:animate-shine"
                    : "opacity-35 grayscale"
                )}
              />
              {!a.earned && (
                <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full border bg-background">
                  <LockIcon className="size-3 text-muted-foreground" />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className={cn("truncate text-sm font-medium", !a.earned && "text-muted-foreground")}>{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.description}</div>
              {!a.earned && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", badge.bar)} style={{ width: `${(a.current / a.target) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{t.progress(a.current, a.target)}</span>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
