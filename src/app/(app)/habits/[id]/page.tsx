import { ArrowLeftIcon, CalendarDaysIcon, FlameIcon, TrendingUpIcon, TrophyIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense, type ReactNode } from "react"

import { Heatmap } from "@/components/heatmap"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getHabitDetail } from "@/lib/data"
import { addDays, formatDate, weekdayMon0, type ISODate } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { completionRate, formatStreak, habitStreak } from "@/lib/streaks"
import { cn } from "@/lib/utils"

import { ActivityChart } from "../../dashboard/activity-chart"
import { HabitActions } from "./habit-actions"

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: "Habit" }

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function HabitPage({ params }: Props) {
  return (
    <div className="grid gap-6">
      <Button variant="ghost" size="sm" className="w-fit" render={<Link href="/dashboard" />}>
        <ArrowLeftIcon /> Dashboard
      </Button>
      <Suspense fallback={<HabitSkeleton />}>
        <HabitDetail params={params} />
      </Suspense>
    </div>
  )
}

async function HabitDetail({ params }: Props) {
  const { id } = await params
  const data = await getHabitDetail(id)
  if (!data) notFound()

  const { habit, logs, today } = data
  const color = habitColor(habit.color)
  const target = habit.target_per_week
  const createdOn = habit.created_at.slice(0, 10)
  const done = new Set<ISODate>(logs.map((l) => l.log_date))
  const streak = habitStreak(done, today, target)
  const counts = new Map<ISODate, number>([...done].map((d) => [d, 1]))
  const yearCount = [...done].filter((d) => d > addDays(today, -365)).length

  // completions per month, last 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - (11 - i))
    const key = d.toISOString().slice(0, 7)
    return {
      date: `${key}-01`,
      label: formatDate(`${key}-01`, { month: "short" }),
      done: [...done].filter((x) => x.startsWith(key)).length,
    }
  })

  // which weekdays the habit is usually done on
  const byWeekday = WEEKDAYS.map(() => 0)
  for (const d of done) byWeekday[weekdayMon0(d)]++
  const maxWeekday = Math.max(1, ...byWeekday)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <span className={cn("size-3 rounded-full", color.dot)} />
            <h1 className="text-2xl font-semibold tracking-tight">{habit.name}</h1>
            {habit.archived_at && <Badge variant="secondary">Archived</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {target < 7 ? `${target}× a week` : "Every day"} · since{" "}
            {formatDate(createdOn, { month: "long", day: "numeric", year: "numeric" })}
          </p>
          {habit.description && <p className="text-sm">{habit.description}</p>}
        </div>
        <HabitActions habit={habit} archived={Boolean(habit.archived_at)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<FlameIcon />} label="Current streak" value={formatStreak(streak)} />
        <Stat icon={<TrophyIcon />} label="Best streak" value={formatStreak({ current: streak.best, unit: streak.unit })} />
        <Stat
          icon={<TrendingUpIcon />}
          label="30-day completion"
          value={`${Math.round(completionRate(done, today, 30, createdOn, target) * 100)}%`}
        />
        <Stat icon={<CalendarDaysIcon />} label="Check-ins (year)" value={String(yearCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last 12 months</CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap counts={counts} max={1} today={today} weeks={53} doneClassName={color.dot} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>By month</CardTitle>
            <CardDescription>Check-ins per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={months} max={Math.max(...months.map((m) => m.done), 1)} color={color.hex} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>By weekday</CardTitle>
            <CardDescription>When you usually do it</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-muted-foreground">{day}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", color.dot)}
                    style={{ width: `${(byWeekday[i] / maxWeekday) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums">{byWeekday[i]}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="gap-1 p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  )
}

function HabitSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
