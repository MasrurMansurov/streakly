import { CalendarX2Icon, LinkIcon, RotateCcwIcon, LightbulbIcon, type LucideIcon } from "lucide-react"

import { IconTile, type IconTone } from "@/components/icon-tile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/i18n/client"
import type { Insight } from "@/lib/insights"
import { cn } from "@/lib/utils"

const pct = (r: number) => Math.round(r * 100)

const LOOK: Record<Insight["kind"], { icon: LucideIcon; tone: IconTone }> = {
  pair: { icon: LinkIcon, tone: "violet" },
  weekday: { icon: CalendarX2Icon, tone: "amber" },
  recovery: { icon: RotateCcwIcon, tone: "emerald" },
}

/** Two labelled bars: "with" vs "without". */
function Compare({ a, b, labelA, labelB, tone }: { a: number; b: number; labelA: string; labelB: string; tone: string }) {
  return (
    <div className="grid gap-1.5 text-xs" aria-hidden>
      {[
        [a, labelA, tone],
        [b, labelB, "bg-muted-foreground/30"],
      ].map(([v, label, color]) => (
        <div key={label as string} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2">
          <span className="truncate text-muted-foreground">{label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span className={cn("block h-full rounded-full", color as string)} style={{ width: `${pct(v as number)}%` }} />
          </span>
          <span className="text-right tabular-nums">{pct(v as number)}%</span>
        </div>
      ))}
    </div>
  )
}

export function InsightsCard({ insights }: { insights: Insight[] }) {
  const { t } = useI18n()
  const x = t.insights

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LightbulbIcon className="size-4 text-violet-500" /> {x.title}
        </CardTitle>
        <CardDescription>{x.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">{x.empty}</p>
        ) : (
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
            {insights.map((i) => {
              const { icon, tone } = LOOK[i.kind]
              return (
                <li key={JSON.stringify(i)} className="grid content-start gap-3">
                  <div className="flex items-center gap-2">
                    <IconTile icon={icon} tone={tone} size="sm" />
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{x.kinds[i.kind]}</span>
                  </div>
                  {i.kind === "pair" && (
                    <>
                      <p className="text-sm leading-relaxed">{x.pair(i.a, i.b, pct(i.withA), pct(i.withoutA))}</p>
                      <Compare a={i.withA} b={i.withoutA} labelA={x.withLabel} labelB={x.withoutLabel} tone="bg-violet-500" />
                      <p className="text-xs text-muted-foreground">{x.pairTip}</p>
                    </>
                  )}
                  {i.kind === "weekday" && (
                    <>
                      <p className="text-sm leading-relaxed">{x.weekday(i.habit, i.weekday, pct(i.rate), pct(i.others))}</p>
                      <Compare a={i.others} b={i.rate} labelA={x.otherDays} labelB={x.weekdayShort[i.weekday]} tone="bg-amber-500" />
                      <p className="text-xs text-muted-foreground">{x.weekdayTip}</p>
                    </>
                  )}
                  {i.kind === "recovery" && (
                    <>
                      <p className="text-sm leading-relaxed">{x.recovery(pct(i.rate))}</p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct(i.rate)}%` }} />
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
