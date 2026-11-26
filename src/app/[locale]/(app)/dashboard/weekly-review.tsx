import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"
import type { WeeklyReview as Review } from "@/lib/review"
import { cn } from "@/lib/utils"

const pct = (r: number) => `${Math.round(r * 100)}%`

/** "This week": completion so far, trend vs last week, 8-week bars, best and lagging habit. */
export function WeeklyReview({ review }: { review: Review }) {
  const { t, locale } = useI18n()
  const { rate, previous, weeks, top, behind } = review
  const delta = rate !== null && previous !== null ? Math.round((rate - previous) * 100) : null
  const Trend = delta === null || delta === 0 ? MinusIcon : delta > 0 ? ArrowUpRightIcon : ArrowDownRightIcon

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.review.title}</CardTitle>
        <CardDescription>{t.review.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[auto_1fr_1.2fr] md:items-center">
        <div className="grid gap-1">
          <span className="font-brand text-4xl font-semibold tabular-nums">{rate === null ? "—" : pct(rate)}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              // a weaker week is just information, never a red alarm
              delta !== null && delta > 0 ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Trend className="size-3.5" />
            {delta === null ? t.review.noComparison : t.review.vsLastWeek(delta)}
          </span>
        </div>

        <div
          className="flex h-20 items-end gap-1.5"
          role="img"
          aria-label={t.review.chartLabel(weeks.map((w) => (w.rate === null ? "—" : pct(w.rate))).join(", "))}
        >
          {weeks.map((w, i) => {
            const current = i === weeks.length - 1
            return (
              <div key={w.start} className="flex h-full flex-1 flex-col justify-end" title={`${formatDay(locale, w.start)}: ${w.rate === null ? "—" : pct(w.rate)}`}>
                <div
                  className={cn(
                    "min-h-1 rounded-sm transition-[height] duration-500",
                    current ? "bg-done" : "bg-done/25"
                  )}
                  style={{ height: `${Math.max(4, (w.rate ?? 0) * 100)}%` }}
                />
              </div>
            )
          })}
        </div>

        <ul className="grid gap-3 text-sm">
          {top && (
            <li>
              <span className="block min-w-0">
                <span className="block text-xs text-muted-foreground">{t.review.onARoll}</span>
                <span className="block truncate font-medium">
                  {top.name} <span className="font-normal text-muted-foreground tabular-nums">· {top.done}/{top.target}</span>
                </span>
              </span>
            </li>
          )}
          {behind && (
            <li>
              <span className="block min-w-0">
                <span className="block text-xs text-muted-foreground">{t.review.needsAttention}</span>
                <span className="block truncate font-medium">
                  {behind.name} <span className="font-normal text-muted-foreground tabular-nums">· {behind.done}/{behind.target}</span>
                </span>
              </span>
            </li>
          )}
          {!top && !behind && <li className="text-muted-foreground">{t.review.empty}</li>}
        </ul>
      </CardContent>
    </Card>
  )
}
