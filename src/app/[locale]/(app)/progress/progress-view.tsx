"use client"

import { useMemo } from "react"

import { Achievements } from "@/components/achievements"
import { Heatmap } from "@/components/heatmap"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"
import type { Achievement } from "@/lib/achievements"
import type { Habit, HabitLog, Pause, Repair } from "@/lib/data"
import { addDays, type ISODate } from "@/lib/dates"
import { findInsights, type DayFeeling } from "@/lib/insights"
import { weeklyReview } from "@/lib/review"
import { bridgesFor } from "@/lib/streaks"

import { ActivityChart } from "../dashboard/activity-chart"
import { InsightsCard } from "../dashboard/insights-card"
import { WeeklyReview } from "../dashboard/weekly-review"

type Props = {
  habits: Habit[]
  logs: HabitLog[]
  today: ISODate
  achievements: Achievement[]
  feelings: Record<ISODate, DayFeeling>
  /** paused and repaired days are left out of the "how you felt" comparison */
  repairs: Repair[]
  pauses: Pause[]
  letter?: React.ReactNode
}

/** Everything about how it's going: this week, patterns, activity, achievements. */
export function ProgressView({ habits, logs, today, achievements, feelings, repairs, pauses, letter }: Props) {
  const { t, locale } = useI18n()

  const byHabit = useMemo(() => {
    const map = new Map<string, Set<ISODate>>(habits.map((h) => [h.id, new Set()]))
    for (const l of logs) map.get(l.habit_id)?.add(l.log_date as ISODate)
    return map
  }, [habits, logs])

  const perDay = useMemo(() => {
    const map = new Map<ISODate, number>()
    for (const [, days] of byHabit) for (const d of days) map.set(d, (map.get(d) ?? 0) + 1)
    return map
  }, [byHabit])

  const input = useMemo(
    () =>
      habits.map((h) => ({
        id: h.id,
        name: h.name,
        target: h.target_per_week,
        createdOn: h.created_at.slice(0, 10) as ISODate,
        done: byHabit.get(h.id)!,
        hasPlan: Boolean(h.cue),
        isPrivate: h.is_private,
        excluded: bridgesFor(h.id, repairs, pauses),
      })),
    [habits, byHabit, repairs, pauses]
  )
  const review = weeklyReview(input, today)
  // the "how you felt" pattern runs a bootstrap and permutation tests — once per data change, not per render
  const insights = useMemo(
    () => findInsights(input, today, 3, new Map(Object.entries(feelings) as [ISODate, DayFeeling][])),
    [input, today, feelings]
  )
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(today, i - 29)
    return { date, label: formatDay(locale, date), done: perDay.get(date) ?? 0 }
  })

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.progress.title}</h1>
        <p className="text-sm text-muted-foreground">{t.progress.subtitle}</p>
      </div>

      {habits.length === 0 ? (
        <Card className="items-center border-dashed py-12 text-center text-sm text-muted-foreground">{t.progress.empty}</Card>
      ) : (
        <>
          <WeeklyReview review={review} />
          {letter}
          <InsightsCard insights={insights} habitColors={Object.fromEntries(habits.map((h) => [h.id, h.color]))} />

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>{t.dashboard.activity}</CardTitle>
                <CardDescription>{t.dashboard.activitySub}</CardDescription>
              </CardHeader>
              <CardContent>
                <Heatmap counts={perDay} max={habits.length} today={today} locale={locale} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t.dashboard.last30}</CardTitle>
                <CardDescription>{t.dashboard.last30Sub}</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityChart data={chartData} max={habits.length} label={t.dashboard.completed} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.achievements.title}</CardTitle>
          <CardDescription>{t.achievements.subtitle(achievements.filter((a) => a.earned).length, achievements.length)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Achievements achievements={achievements} locale={locale} />
        </CardContent>
      </Card>
    </div>
  )
}
