import { CrownIcon, FlameIcon, LockIcon, MedalIcon, SparklesIcon, TrophyIcon, ZapIcon, type LucideIcon } from "lucide-react"

import { getDictionary, type Locale } from "@/i18n"
import type { Achievement, AchievementId } from "@/lib/achievements"
import { cn } from "@/lib/utils"

/** Icon and colors per badge (full class names so Tailwind picks them up). */
export const BADGES: Record<AchievementId, { icon: LucideIcon; bg: string; fg: string; bar: string }> = {
  first_checkin: { icon: SparklesIcon, bg: "bg-emerald-500/15", fg: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  streak_7: { icon: FlameIcon, bg: "bg-amber-500/15", fg: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  streak_30: { icon: ZapIcon, bg: "bg-orange-500/15", fg: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500" },
  streak_100: { icon: CrownIcon, bg: "bg-violet-500/15", fg: "text-violet-600 dark:text-violet-400", bar: "bg-violet-500" },
  checkins_100: { icon: MedalIcon, bg: "bg-sky-500/15", fg: "text-sky-600 dark:text-sky-400", bar: "bg-sky-500" },
  checkins_500: { icon: TrophyIcon, bg: "bg-rose-500/15", fg: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500" },
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
        const Icon = a.earned ? badge.icon : LockIcon
        const item = t.items[a.id]
        return (
          <li
            key={a.id}
            className={cn("flex items-center gap-3 rounded-xl border p-3", !a.earned && "bg-muted/40")}
            aria-label={`${item.name}: ${a.earned ? t.earned : t.progress(a.current, a.target)}`}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                a.earned ? cn(badge.bg, badge.fg) : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
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
