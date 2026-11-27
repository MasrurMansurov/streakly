import { DotCompare } from "@/components/dot-compare"
import { Link } from "@/components/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { intlLocale, type Dictionary, type Locale } from "@/i18n"
import type { ISODate } from "@/lib/dates"
import { compareFeeling, type DayFeeling, type FeelingComparison, type Lag, type Metric } from "@/lib/feeling-compare"
import { habitColor } from "@/lib/habit-colors"
import { typo } from "@/lib/typography"
import { cn } from "@/lib/utils"

type Props = {
  habit: { id: string; name: string; color: string; createdOn: ISODate }
  done: ReadonlySet<ISODate>
  feelings: ReadonlyMap<ISODate, DayFeeling>
  /** paused and repaired days: left out */
  excluded: ReadonlySet<ISODate>
  today: ISODate
  lag: Lag
  t: Dictionary
  locale: Locale
}

/**
 * "How you felt": mood and energy on days with vs. without this habit — the
 * person opens it themselves, so both directions are shown in the same neutral
 * way, with the day counts and a plain note that this isn't cause and effect.
 * The numbers come from lib/feeling-compare.ts (weekday-adjusted, 14+ days per
 * side for a verdict).
 */
export function FeelingCompareCard({ habit, done, feelings, excluded, today, lag, t, locale }: Props) {
  const f = t.feelingCompare
  const one = new Intl.NumberFormat(intlLocale[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const dot = habitColor(habit.color).dot
  const rated = [...feelings.values()].some((x) => x.mood != null || x.energy != null)
  const rows = (["mood", "energy"] as const).map((metric) => ({
    metric,
    result: compareFeeling({ id: habit.id, createdOn: habit.createdOn, done, feelings, today, excluded, metric, lag }),
  }))
  const anyClear = rows.some((r) => r.result.level === "clear")

  const sentence = (metric: Metric, r: FeelingComparison) => {
    switch (r.level) {
      case "notEnough":
        return r.needWithout > 0 ? f.notEnough(r.needWithout, "without", habit.name) : f.notEnough(r.needWith, "with", habit.name)
      case "skewed":
        return f.skewed(habit.name)
      case "early":
        return f.early
      case "clear":
        return f.clear(metric, habit.name, r.withAvg > r.withoutAvg, lag, one.format(r.withAvg), one.format(r.withoutAvg))
      case "same":
        return f.same
      case "unclear":
        return f.unclear(one.format(r.withAvg), one.format(r.withoutAvg))
    }
  }

  return (
    <Card id="feeling">
      <CardHeader className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="grid gap-1">
          <CardTitle>{f.title}</CardTitle>
          <CardDescription>{f.subtitle}</CardDescription>
        </div>
        {rated && (
          <nav aria-label={f.lagLabel} className="flex rounded-lg border bg-card p-0.5 text-sm">
            {([0, 1] as const).map((l) => (
              <Link
                key={l}
                href={`/habits/${habit.id}${l === 1 ? "?lag=1" : ""}#feeling`}
                scroll={false}
                aria-current={lag === l ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  lag === l ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l === 0 ? f.sameDay : f.nextDay}
              </Link>
            ))}
          </nav>
        )}
      </CardHeader>
      <CardContent className="grid gap-6">
        {!rated ? (
          <p className="text-sm text-muted-foreground">{typo(locale, f.noRatings)}</p>
        ) : (
          <>
            {rows.map(({ metric, result: r }) => (
              <section key={metric} aria-labelledby={`feeling-${metric}`} className="grid gap-2.5">
                <h3 id={`feeling-${metric}`} className="text-sm font-medium">
                  {metric === "mood" ? t.feeling.mood : t.feeling.energy}
                </h3>
                {r.level === "notEnough" || r.level === "skewed" ? (
                  // the shape of the future comparison: an empty scale, nothing invented
                  <div aria-hidden className="flex items-center gap-2.5 text-[11px] text-muted-foreground tabular-nums">
                    <span>1</span>
                    <span className="h-px flex-1 bg-border" />
                    <span>5</span>
                  </div>
                ) : (
                  <DotCompare
                    withAvg={r.withAvg}
                    withoutAvg={r.withoutAvg}
                    nWith={r.nWith}
                    nWithout={r.nWithout}
                    dotClass={dot}
                    muted={r.level === "early"}
                    labels={{ with: f.with, without: f.without, days: f.days, format: (v) => one.format(v) }}
                  />
                )}
                <p className="text-sm">{typo(locale, sentence(metric, r))}</p>
              </section>
            ))}
            <div className="grid gap-1 text-xs text-muted-foreground">
              <p>{typo(locale, f.caveat)}</p>
              {anyClear && <p>{typo(locale, f.tryIt)}</p>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
