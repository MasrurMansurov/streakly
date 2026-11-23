"use client"

import { FlameIcon, PlusIcon, SparklesIcon, TargetIcon, TrendingUpIcon } from "lucide-react"
import { useMemo, useOptimistic, useState, useTransition, type ReactNode } from "react"
import { toast } from "sonner"

import { reorderHabits, toggleHabitLog } from "@/app/actions/habits"
import { Heatmap } from "@/components/heatmap"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Habit, HabitLog } from "@/lib/data"
import { Link } from "@/components/link"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { addDays, type ISODate } from "@/lib/dates"
import { completionRate, habitStreak, isDueToday } from "@/lib/streaks"

import { ActivityChart } from "./activity-chart"
import { HabitCard } from "./habit-card"
import { HabitFormDialog } from "./habit-form-dialog"
import { SortableHabits } from "./sortable-habits"

type Props = {
  habits: Habit[]
  logs: HabitLog[]
  today: ISODate
  profile: { username: string; display_name: string | null; is_public: boolean } | null
  archivedCount: number
}

type Toggle = { habitId: string; date: ISODate; done: boolean }

export function DashboardView({ habits: serverHabits, logs, today, profile, archivedCount }: Props) {
  const { locale, t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [, startTransition] = useTransition()

  // optimistic order while the new positions are saved
  const [habits, applyOrder] = useOptimistic(serverHabits, (state: Habit[], ids: string[]) =>
    ids.map((id) => state.find((h) => h.id === id)).filter((h): h is Habit => Boolean(h))
  )

  const onReorder = (ids: string[]) => {
    startTransition(async () => {
      applyOrder(ids)
      const res = await reorderHabits(ids)
      if (!res.ok) toast.error(res.error)
    })
  }

  // optimistic check-ins: UI updates instantly, server confirms in the background
  const [optimisticLogs, applyToggle] = useOptimistic(logs, (state: HabitLog[], t: Toggle) =>
    t.done
      ? [...state, { habit_id: t.habitId, log_date: t.date }]
      : state.filter((l) => !(l.habit_id === t.habitId && l.log_date === t.date))
  )

  const onToggle = (habitId: string, date: ISODate, done: boolean) => {
    startTransition(async () => {
      applyToggle({ habitId, date, done })
      const res = await toggleHabitLog(habitId, date, done)
      if (!res.ok) toast.error(res.error)
    })
  }

  const byHabit = useMemo(() => {
    const map = new Map<string, Set<ISODate>>()
    for (const h of habits) map.set(h.id, new Set())
    for (const l of optimisticLogs) map.get(l.habit_id)?.add(l.log_date)
    return map
  }, [habits, optimisticLogs])

  const perDay = useMemo(() => {
    const map = new Map<ISODate, number>()
    for (const [, days] of byHabit) for (const d of days) map.set(d, (map.get(d) ?? 0) + 1)
    return map
  }, [byHabit])

  const doneToday = habits.filter((h) => byHabit.get(h.id)?.has(today)).length
  // weekly habits whose target is already met aren't "left" for today
  const leftToday = habits.filter((h) => isDueToday(byHabit.get(h.id)!, today, h.target_per_week)).length
  const best = habits
    .map((h) => habitStreak(byHabit.get(h.id)!, today, h.target_per_week))
    .sort((a, b) => (b.unit === "day" ? b.current : b.current * 7) - (a.unit === "day" ? a.current : a.current * 7))[0]
  const bestStreak = t.dashboard.streakShort(best?.current ?? 0, best?.unit ?? "day")
  const rate30 = habits.length
    ? habits.reduce((s, h) => s + completionRate(byHabit.get(h.id)!, today, 30, h.created_at.slice(0, 10), h.target_per_week), 0) /
      habits.length
    : 0
  const totalCheckIns = [...perDay.values()].reduce((a, b) => a + b, 0)

  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(today, i - 29)
    return { date, label: formatDay(locale, date), done: perDay.get(date) ?? 0 }
  })

  const name = profile?.display_name || profile?.username

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {formatDay(locale, today, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {habits.length === 0
              ? t.dashboard.welcome(name)
              : leftToday === 0
                ? t.dashboard.allDone
                : t.dashboard.leftToday(leftToday)}
          </h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon /> {t.dashboard.newHabit}
        </Button>
      </div>

      {habits.length === 0 ? (
        <Card className="items-center border-dashed py-12 text-center">
          <SparklesIcon className="size-8 text-emerald-500" />
          <div className="grid gap-1">
            <h2 className="font-medium">{t.dashboard.emptyTitle}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t.dashboard.emptyText}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon /> {t.dashboard.createFirst}
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={<TargetIcon />} label={t.dashboard.statToday} value={`${doneToday}/${habits.length}`} />
            <Stat icon={<FlameIcon />} label={t.dashboard.statBestStreak} value={bestStreak} />
            <Stat icon={<TrendingUpIcon />} label={t.dashboard.statCompletion} value={`${Math.round(rate30 * 100)}%`} />
            <Stat icon={<SparklesIcon />} label={t.dashboard.statCheckIns} value={String(totalCheckIns)} />
          </div>

          <SortableHabits
            habits={habits}
            onReorder={onReorder}
            renderHabit={(h, dragHandle) => (
              <HabitCard
                habit={h}
                done={byHabit.get(h.id)!}
                today={today}
                onToggle={onToggle}
                dragHandle={habits.length > 1 ? dragHandle : undefined}
              />
            )}
          />

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

          {archivedCount > 0 && (
            <p className="-mt-4 text-center text-sm">
              <Link href="/archive" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                {t.dashboard.archivedLink(archivedCount)}
              </Link>
            </p>
          )}

          {profile && !profile.is_public && (
            <p className="text-center text-sm text-muted-foreground">
              {t.dashboard.makePublicPrompt}{" "}
              <Link href="/settings" className="font-medium text-foreground underline underline-offset-4">
                {t.dashboard.makePublicLink}
              </Link>
            </p>
          )}
        </>
      )}

      <HabitFormDialog open={createOpen} onOpenChange={setCreateOpen} />
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
