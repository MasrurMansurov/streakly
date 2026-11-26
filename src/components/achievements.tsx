import { AchievementBadge } from "@/components/achievement-badge"
import { getDictionary, type Locale } from "@/i18n"
import type { Achievement } from "@/lib/achievements"
import { cn } from "@/lib/utils"

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
        const item = t.items[a.id]
        return (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-xl border p-3"
            aria-label={`${item.name}: ${a.earned ? t.earned : t.progress(a.current, a.target)}`}
          >
            <AchievementBadge
              id={a.id}
              earned={a.earned}
              size={56}
            />
            <div className="min-w-0 flex-1">
              <div className={cn("truncate text-sm font-medium", !a.earned && "text-muted-foreground")}>{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.description}</div>
              {!a.earned && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground/50" style={{ width: `${(a.current / a.target) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{t.progress(a.current, a.target)}</span>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
