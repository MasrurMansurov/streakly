import {
  ArrowLeftIcon,
  GraduationCapIcon,
  LockIcon,
  RotateCcwIcon,
  ClockArrowUpIcon,
  StickyNoteIcon,
} from "lucide-react"
import type { Metadata } from "next"

import { getT } from "@/i18n/server"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Heatmap } from "@/components/heatmap"
import { IconTile } from "@/components/icon-tile"
import { Link } from "@/components/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getHabitDetail } from "@/lib/data"
import { formatDay, type Dictionary, type Locale } from "@/i18n"
import { addDays, weekdayMon0, type ISODate } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { bridgesFor, completionRate, habitStreak } from "@/lib/streaks"
import { graduation, habitStrength } from "@/lib/strength"
import { cn } from "@/lib/utils"

import { ActivityChart } from "../../dashboard/activity-chart"
import { comebackDays, isQuickComeback } from "@/lib/comeback"

import { SummaryStrip } from "@/components/summary-strip"
import { ArchivedCheckIn } from "./archived-check-in"
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

  const { habit, logs, today, notes, repairs, pauses, strength } = data
  const color = habitColor(habit.color)
  const target = habit.target_per_week
  const createdOn = habit.created_at.slice(0, 10)
  const done = new Set<ISODate>(logs.map((l) => l.log_date))
  const bridges = bridgesFor(habit.id, repairs, pauses)
  // comeback bonus: returns after a missed day in the last year
  const comebacks = comebackDays(done, bridges)
  const quickComebacks = comebacks.filter((d) => isQuickComeback(done, d, bridges)).length
  const streak = habitStreak(done, today, target, bridges)
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
            {habit.is_private && (
              <Badge variant="outline" className="gap-1">
                <LockIcon className="size-3" aria-hidden /> {t.habitForm.private}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {target < 7 ? t.habit.timesWeek(target) : t.habit.everyDay} ·{" "}
            {t.habitPage.since(formatDay(locale, createdOn, { month: "long", day: "numeric", year: "numeric" }))}
          </p>
          {habit.cue && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground" title={t.habit.planTitle}>
              <ClockArrowUpIcon className={cn("size-4", color.text)} aria-hidden /> {t.habit.when(habit.cue)}
            </p>
          )}
          {habit.description && <p className="text-sm">{habit.description}</p>}
        </div>
        <HabitActions habit={habit} archived={Boolean(habit.archived_at)} />
      </div>

      {habit.archived_at && (
        <ArchivedCheckIn
          habitId={habit.id}
          color={habit.color}
          today={today}
          createdOn={createdOn as ISODate}
          done={[...done].filter((d) => d > addDays(today, -7))}
        />
      )}

      <SummaryStrip
        className="max-sm:grid-cols-2! max-sm:divide-x-0"
        items={[
          { label: t.habitPage.currentStreak, value: t.habit.streak(streak.current, streak.unit) },
          { label: t.habitPage.bestStreak, value: t.habit.streak(streak.best, streak.unit) },
          { label: t.habitPage.completion, value: `${Math.round(completionRate(done, today, 30, createdOn, target, bridges) * 100)}%` },
          { label: t.habitPage.checkInsYear, value: String(yearCount) },
        ]}
      />

      {target >= 7 && comebacks.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <RotateCcwIcon className="size-4 text-teal-700 dark:text-teal-400" aria-hidden />
          {t.habitPage.comebacks(comebacks.length, quickComebacks)}
        </p>
      )}

      <StrengthCard
        t={t}
        locale={locale}
        strength={strength}
        createdOn={createdOn as ISODate}
        today={today}
        completion28={completionRate(done, today, 28, createdOn, target, bridges)}
        graduated={Boolean(habit.graduated_at)}
      />

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


function HabitSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-8 w-64" />
      {/* matches the summary strip */}
      <Skeleton className="h-[68px] rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

function StrengthCard({
  t,
  locale,
  strength,
  createdOn,
  today,
  completion28,
  graduated,
}: {
  t: Dictionary
  locale: Locale
  strength: { week: ISODate; score: number }[]
  createdOn: ISODate
  today: ISODate
  completion28: number
  graduated: boolean
}) {
  const value = habitStrength({ scores: strength.map((s) => s.score), completion28 })
  const g = graduation({ createdOn, today, scores: strength.map((s) => s.score), completion28 })
  const weeks = [...strength].slice(0, 8).reverse()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCapIcon className="size-4 text-muted-foreground" aria-hidden /> {t.strength.title}
        </CardTitle>
        <CardDescription>{t.strength.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">
        <div className="grid gap-1">
          {/* no big placeholder dash: without a score, just say where the habit stands */}
          {value !== null && <span className="font-heading text-4xl font-semibold">{value}%</span>}
          <span className={value === null ? "text-sm font-medium" : "text-xs text-muted-foreground"}>
            {graduated ? t.strength.graduated : g.ready ? t.strength.readyTitle : t.strength.progress(g.daysLeft)}
          </span>
        </div>
        {weeks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.strength.none}</p>
        ) : (
          <div className="grid gap-1">
            <div className="flex h-16 items-end gap-1.5" role="img" aria-label={`${t.strength.weeks}: ${weeks.map((w) => w.score).join(", ")}`}>
              {weeks.map((w) => (
                <div key={w.week} className="flex h-full flex-1 flex-col justify-end" title={`${formatDay(locale, w.week)}: ${w.score}/5`}>
                  <div className="rounded-sm bg-emerald-500/80" style={{ height: `${(w.score / 5) * 100}%` }} />
                </div>
              ))}
            </div>
            {!graduated && !g.ready && (g.needsFeel || g.needsConsistency) && (
              <p className="text-xs text-muted-foreground">
                {[g.needsFeel && t.strength.needsFeel, g.needsConsistency && t.strength.needsConsistency].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
