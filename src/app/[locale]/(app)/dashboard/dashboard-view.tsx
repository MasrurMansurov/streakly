"use client"

import {
  CircleCheckBigIcon,
  CircleCheckIcon,
  FlameIcon,
  PlusIcon,
  SproutIcon,
  TargetIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { reorderHabits, toggleHabitLog } from "@/app/actions/habits"
import { AchievementBadge } from "@/components/achievement-badge"
import { Achievements } from "@/components/achievements"
import { ConfettiBurst } from "@/components/confetti-burst"
import { IconTile, type IconTone } from "@/components/icon-tile"
import { Heatmap } from "@/components/heatmap"
import { HabitTemplates } from "./habit-templates"
import { WeeklyReview } from "./weekly-review"
import { weeklyReview } from "@/lib/review"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Habit, HabitLog } from "@/lib/data"
import { Link } from "@/components/link"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { addDays, type ISODate } from "@/lib/dates"
import { newlyEarned, type Achievement } from "@/lib/achievements"
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
  todayNotes: Record<string, string>
  achievements: Achievement[]
}

type Toggle = { habitId: string; date: ISODate; done: boolean }

export function DashboardView({ habits: serverHabits, logs, today, profile, archivedCount, todayNotes, achievements }: Props) {
  const { locale, t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)

  // celebrate achievements unlocked by a check-in (the server re-renders with new stats)
  const previous = useRef(achievements)
  useEffect(() => {
    for (const id of newlyEarned(previous.current, achievements)) {
      toast.success(t.achievements.unlocked(t.achievements.items[id].name), {
        duration: 6000,
        icon: <AchievementBadge id={id} size={28} className="motion-safe:animate-pop" />,
      })
    }
    previous.current = achievements
  }, [achievements, t])
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

  // bumped when a check-in completes the day → plays the celebration once
  const [celebration, setCelebration] = useState(0)

  const onToggle = (habitId: string, date: ISODate, done: boolean) => {
    if (done && date === today) {
      const stillDue = habits.filter((h) => h.id !== habitId && isDueToday(byHabit.get(h.id)!, today, h.target_per_week))
      if (stillDue.length === 0) setCelebration((n) => n + 1)
    }
    startTransition(async () => {
      applyToggle({ habitId, date, done })
      const res = await toggleHabitLog(habitId, date, done)
      if (!res.ok) toast.error(res.error)
    })
  }

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
  const review = useMemo(
    () =>
      weeklyReview(
        habits.map((h) => ({
          id: h.id,
          name: h.name,
          target: h.target_per_week,
          createdOn: h.created_at.slice(0, 10) as ISODate,
          done: byHabit.get(h.id)!,
        })),
        today
      ),
    [habits, byHabit, today]
  )
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
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {habits.length === 0 ? (
              t.dashboard.welcome(name)
            ) : leftToday === 0 ? (
              <>
                {t.dashboard.allDone}
                <span className="relative inline-flex">
                  <CircleCheckIcon
                    key={celebration}
                    aria-hidden
                    className={cn(
                      "size-7 text-emerald-500",
                      celebration > 0 && "motion-safe:animate-pop"
                    )}
                  />
                  {celebration > 0 && <ConfettiBurst key={celebration} count={14} distance={36} />}
                </span>
              </>
            ) : (
              t.dashboard.leftToday(leftToday)
            )}
          </h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon /> {t.dashboard.newHabit}
        </Button>
      </div>

      {habits.length === 0 ? (
        <Card className="gap-6 border-dashed px-4 py-10 sm:px-8">
          <div className="grid justify-items-center gap-3 text-center">
            <IconTile icon={SproutIcon} size="lg" />
            <h2 className="font-medium">{t.templates.title}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">{t.templates.subtitle}</p>
          </div>
          <HabitTemplates />
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <PlusIcon /> {t.templates.orOwn}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat index={0} icon={TargetIcon} tone="emerald" label={t.dashboard.statToday} value={`${doneToday}/${habits.length}`} />
            <Stat index={1} icon={FlameIcon} tone="orange" label={t.dashboard.statBestStreak} value={bestStreak} />
            <Stat index={2} icon={TrendingUpIcon} tone="sky" label={t.dashboard.statCompletion} value={`${Math.round(rate30 * 100)}%`} />
            <Stat index={3} icon={CircleCheckBigIcon} tone="violet" label={t.dashboard.statCheckIns} value={String(totalCheckIns)} />
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
                todayNote={todayNotes[h.id]}
                dragHandle={habits.length > 1 ? dragHandle : undefined}
              />
            )}
          />

          <WeeklyReview review={review} />

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

          <Card>
            <CardHeader>
              <CardTitle>{t.achievements.title}</CardTitle>
              <CardDescription>
                {t.achievements.subtitle(achievements.filter((a) => a.earned).length, achievements.length)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Achievements achievements={achievements} locale={locale} />
            </CardContent>
          </Card>

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
