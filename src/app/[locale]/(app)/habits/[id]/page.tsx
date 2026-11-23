import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  FlameIcon,
  StickyNoteIcon,
  TrendingUpIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react"
import type { Metadata } from "next"

import { getT } from "@/i18n/server"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Heatmap } from "@/components/heatmap"
import { IconTile, type IconTone } from "@/components/icon-tile"
import { Link } from "@/components/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getHabitDetail } from "@/lib/data"
import { formatDay } from "@/i18n"
import { addDays, weekdayMon0, type ISODate } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { completionRate, habitStreak } from "@/lib/streaks"
import { cn } from "@/lib/utils"

import { ActivityChart } from "../../dashboard/activity-chart"
import { HabitActions } from "./habit-actions"
import { NotesList } from "./notes-list"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.habit }
}

const A_MONDAY = "2026-11-23"

export default async function HabitPage({ params }: Props) {
  const { t } = await getT()
  return (
    <div className="grid gap-6">
      <Button variant="ghost" size="sm" className="w-fit" render={<Link href="/dashboard" />}>
        <ArrowLeftIcon /> {t.common.dashboard}
      </Button>
      <Suspense fallback={<HabitSkeleton />}>
        <HabitDetail params={params} />
      </Suspense>
    </div>
  )
}

async function HabitDetail({ params }: Props) {
  const { id } = await params
  const [data, { locale, t }] = await Promise.all([getHabitDetail(id), getT()])
  const weekdays = Array.from({ length: 7 }, (_, i) => formatDay(locale, addDays(A_MONDAY, i), { weekday: "short" }))
  if (!data) notFound()

  const { habit, logs, today, notes } = data
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
      label: formatDay(locale, `${key}-01`, { month: "short" }),
      done: [...done].filter((x) => x.startsWith(key)).length,
    }
  })

  // which weekdays the habit is usually done on
  const byWeekday = weekdays.map(() => 0)
  for (const d of done) byWeekday[weekdayMon0(d)]++
  const maxWeekday = Math.max(1, ...byWeekday)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <span className={cn("size-3 rounded-full", color.dot)} />
            <h1 className="text-2xl font-semibold tracking-tight">{habit.name}</h1>
            {habit.archived_at && <Badge variant="secondary">{t.habitPage.archivedBadge}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {target < 7 ? t.habit.timesWeek(target) : t.habit.everyDay} ·{" "}
            {t.habitPage.since(formatDay(locale, createdOn, { month: "long", day: "numeric", year: "numeric" }))}
          </p>
          {habit.description && <p className="text-sm">{habit.description}</p>}
        </div>
        <HabitActions habit={habit} archived={Boolean(habit.archived_at)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={FlameIcon} tone="orange" label={t.habitPage.currentStreak} value={t.habit.streak(streak.current, streak.unit)} />
        <Stat icon={TrophyIcon} tone="amber" label={t.habitPage.bestStreak} value={t.habit.streak(streak.best, streak.unit)} />
        <Stat
          icon={TrendingUpIcon}
          tone="sky"
          label={t.habitPage.completion}
          value={`${Math.round(completionRate(done, today, 30, createdOn, target) * 100)}%`}
        />
        <Stat icon={CalendarDaysIcon} tone="violet" label={t.habitPage.checkInsYear} value={String(yearCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.habitPage.last12}</CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap counts={counts} max={1} today={today} weeks={53} doneClassName={color.dot} locale={locale} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t.habitPage.byMonth}</CardTitle>
            <CardDescription>{t.habitPage.byMonthSub}</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={months} max={Math.max(...months.map((m) => m.done), 1)} color={color.hex} label={t.habitPage.byMonthSub} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.habitPage.byWeekday}</CardTitle>
            <CardDescription>{t.habitPage.byWeekdaySub}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {weekdays.map((day, i) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTile icon={StickyNoteIcon} tone="amber" size="sm" /> {t.notes.title}
          </CardTitle>
          <CardDescription>{t.notes.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <NotesList
            habitId={habit.id}
            habitName={habit.name}
            dates={[...done].filter((d) => d > addDays(today, -30)).sort().reverse()}
            notes={notes}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  icon,
  tone,
  label,
  value,
  index = 0,
}: {
  icon: LucideIcon
  tone: IconTone
  label: string
  value: string
  index?: number
}) {
  return (
    <Card
      className="flex-row items-center gap-3 p-4 transition-shadow hover:shadow-md motion-safe:animate-rise"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </div>
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
