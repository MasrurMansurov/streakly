import { CalendarX2Icon, ClockArrowUpIcon, SmileIcon, LinkIcon, RotateCcwIcon, LightbulbIcon, type LucideIcon } from "lucide-react"

import { DotCompare } from "@/components/dot-compare"
import { Link } from "@/components/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/i18n/client"
import { intlLocale } from "@/i18n"
import { habitColor } from "@/lib/habit-colors"
import type { Insight } from "@/lib/insights"
import { cn } from "@/lib/utils"

const pct = (r: number) => Math.round(r * 100)

const ICONS: Record<Insight["kind"], LucideIcon> = {
  pair: LinkIcon,
  weekday: CalendarX2Icon,
  recovery: RotateCcwIcon,
  plan: ClockArrowUpIcon,
  mood: SmileIcon,
}

/** Two labelled bars: "with" vs "without". */
function Compare({
  a,
  b,
  labelA,
  labelB,
  format = (v) => `${pct(v)}%`,
}: {
  a: number
  b: number
  labelA: string
  labelB: string
  format?: (v: number) => string
}) {
  return (
    <div className="grid gap-1.5 text-xs" aria-hidden>
      {[
        // one ink for every insight: the finding is the text, the bar only shows the gap
        [a, labelA, "bg-foreground/70"],
        [b, labelB, "bg-muted-foreground/30"],
      ].map(([v, label, color]) => (
        <div key={label as string} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2">
          <span className="truncate text-muted-foreground">{label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span className={cn("block h-full rounded-full", color as string)} style={{ width: `${pct(v as number)}%` }} />
          </span>
          <span className="text-right tabular-nums">{format(v as number)}</span>
        </div>
      ))}
    </div>
  )
}

export function InsightsCard({ insights, habitColors = {} }: { insights: Insight[]; habitColors?: Record<string, string> }) {
  const { t, locale } = useI18n()
  const x = t.insights
  const one = new Intl.NumberFormat(intlLocale[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LightbulbIcon className="size-4 text-muted-foreground" aria-hidden /> {x.title}
        </CardTitle>
        <CardDescription>{x.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">{x.empty}</p>
        ) : (
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
            {insights.map((i) => {
              const Icon = ICONS[i.kind]
              return (
                <li key={JSON.stringify(i)} className="grid content-start gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {x.kinds[i.kind]}
                  </div>
                  {i.kind === "pair" && (
                    <>
                      <p className="text-sm leading-relaxed">{x.pair(i.a, i.b, pct(i.withA), pct(i.withoutA))}</p>
                      <Compare a={i.withA} b={i.withoutA} labelA={x.withLabel} labelB={x.withoutLabel} />
                      <p className="text-xs text-muted-foreground">{x.pairTip}</p>
                    </>
                  )}
                  {i.kind === "weekday" && (
                    <>
                      <p className="text-sm leading-relaxed">{x.weekday(i.habit, i.weekday, pct(i.rate), pct(i.others))}</p>
                      <Compare a={i.others} b={i.rate} labelA={x.otherDays} labelB={x.weekdayShort[i.weekday]} />
                      <p className="text-xs text-muted-foreground">{x.weekdayTip}</p>
                    </>
                  )}
                  {i.kind === "mood" && (
                    <>
                      <p className="text-sm leading-relaxed">
                        {x.mood(i.habit, i.metric, one.format(i.withAvg), one.format(i.withoutAvg), i.withAvg > i.withoutAvg)}
                      </p>
                      <DotCompare
                        withAvg={i.withAvg}
                        withoutAvg={i.withoutAvg}
                        nWith={i.nWith}
                        nWithout={i.nWithout}
                        dotClass={habitColor(habitColors[i.habitId] ?? "emerald").dot}
                        labels={{ with: t.feelingCompare.with, without: t.feelingCompare.without, days: t.feelingCompare.days, format: (v) => one.format(v) }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.feelingCompare.caveat}{" "}
                        <Link href={`/habits/${i.habitId}`} className="font-medium text-foreground underline underline-offset-4">
                          {x.moodMore}
                        </Link>
                      </p>
                    </>
                  )}
                  {i.kind === "plan" && (
                    <>
                      <p className="text-sm leading-relaxed">{x.plan(i.habit, pct(i.rate))}</p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${pct(i.rate)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {x.planTip}{" "}
                        <Link href={`/habits/${i.habitId}`} className="font-medium text-foreground underline underline-offset-4">
                          {x.planCta}
                        </Link>
                      </p>
                    </>
                  )}
                  {i.kind === "recovery" && (
                    <>
                      <p className="text-sm leading-relaxed">{x.recovery(pct(i.rate))}</p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span className="block h-full rounded-full bg-done" style={{ width: `${pct(i.rate)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{i.rate >= 0.7 ? x.recoveryGood : x.recoveryTip}</p>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
