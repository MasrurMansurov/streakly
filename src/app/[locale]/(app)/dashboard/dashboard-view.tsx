"use client"

import {
  ChevronRightIcon,
  GraduationCapIcon,
  CircleCheckIcon,
  CloudOffIcon,
  TreePalmIcon,
  PlusIcon,
  Share2Icon,
  SproutIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { reorderHabits, toggleHabitLog } from "@/app/actions/habits"
import { applyQueue, enqueue, loadQueue, saveQueue, type QueuedToggle } from "@/lib/offline-queue"
import { canComeBackToday, comebackDays, isQuickComeback } from "@/lib/comeback"
import { AchievementBadge } from "@/components/achievement-badge"
import { ConfettiBurst } from "@/components/confetti-burst"
import { IconTile } from "@/components/icon-tile"
import { SummaryStrip } from "@/components/summary-strip"
import { HabitTemplates } from "./habit-templates"
import { PactsCard } from "./pacts-card"
import { ShareDialog } from "./share-dialog"
import type { Pact } from "@/lib/pacts"
import type { DayFeeling } from "@/lib/insights"
import { FeelingCard } from "./feeling-card"
import type { Challenge } from "@/lib/challenges"
import { ChallengesCard } from "@/components/challenges/challenges-card"
import type { Pause, Repair } from "@/lib/data"
import { findInsights } from "@/lib/insights"
import { weeklyReview } from "@/lib/review"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import type { Habit, HabitLog } from "@/lib/data"
import { Link } from "@/components/link"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"
import type { ISODate } from "@/lib/dates"
import { clientToday } from "@/lib/day-start-client"
import { newlyEarned, type Achievement } from "@/lib/achievements"
import { bridgesFor, completionRate, daysBetween, habitStreak, isDueToday } from "@/lib/streaks"
import { asPauseReason, type PauseReason } from "@/lib/pause"

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
  pacts: Pact[]
  challenges: Challenge[]
  repairs: Repair[]
  pauses: Pause[]
  strength: Record<string, { week: ISODate; score: number }[]>
  feelings: Record<ISODate, DayFeeling>
}

type Toggle = { habitId: string; date: ISODate; done: boolean; mini?: boolean }

export function DashboardView({ habits: serverHabits, logs, today, profile, archivedCount, todayNotes, achievements, pacts, challenges, repairs, pauses, strength, feelings }: Props) {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

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
  // offline check-ins: queued on the device, shown right away, sent when the connection is back
  const queueKey = `streakly:offline:${profile?.username ?? "me"}`
  const [queue, setQueue] = useState<QueuedToggle[]>([])
  const [online, setOnline] = useState(true)
  // bumped on return to the app → retry sending (Safari has no Background Sync)
  const [flushTick, setFlushTick] = useState(0)
  const flushing = useRef(false)
  const updateQueue = (fn: (q: QueuedToggle[]) => QueuedToggle[]) =>
    setQueue((q) => {
      const next = fn(q)
      saveQueue(queueKey, next)
      return next
    })

  useEffect(() => {
    // read device-only state after hydration (the server can't know it)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueue(loadQueue(queueKey))
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    const visible = () => {
      if (document.visibilityState !== "visible") return
      setOnline(navigator.onLine)
      setFlushTick((n) => n + 1)
    }
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    document.addEventListener("visibilitychange", visible)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
      document.removeEventListener("visibilitychange", visible)
    }
  }, [queueKey])

  useEffect(() => {
    if (!online || queue.length === 0 || flushing.current) return
    flushing.current = true
    const pending = [...queue]
    void (async () => {
      let sent = 0
      try {
        for (const item of pending) {
          const res = await toggleHabitLog(item.habitId, item.date, item.done, item.mini)
          if (!res.ok) toast.error(res.error)
          updateQueue((q) =>
            q.filter((x) => x !== item && !(x.habitId === item.habitId && x.date === item.date && x.done === item.done && !x.mini === !item.mini))
          )
          sent++
        }
      } catch {
        // still no connection — keep the rest for the next "online" event
      } finally {
        flushing.current = false
        if (sent) toast.success(t.offline.synced(sent))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, queue.length, flushTick])

  const baseLogs = useMemo(
    () => applyQueue(logs, queue, (q) => ({ habit_id: q.habitId, log_date: q.date, is_mini: Boolean(q.mini) })),
    [logs, queue]
  )

  const [optimisticLogs, applyToggle] = useOptimistic(baseLogs, (state: HabitLog[], t: Toggle) =>
    t.done
      ? [...state.filter((l) => !(l.habit_id === t.habitId && l.log_date === t.date)), { habit_id: t.habitId, log_date: t.date, is_mini: Boolean(t.mini) }]
      : state.filter((l) => !(l.habit_id === t.habitId && l.log_date === t.date))
  )

  const byHabit = useMemo(() => {
    const map = new Map<string, Set<ISODate>>()
    for (const h of habits) map.set(h.id, new Set())
    for (const l of optimisticLogs) map.get(l.habit_id)?.add(l.log_date)
    return map
  }, [habits, optimisticLogs])

  // days done in the "mini" version, per habit
  const miniByHabit = useMemo(() => {
    const map = new Map<string, Set<ISODate>>()
    for (const l of optimisticLogs) if (l.is_mini) map.set(l.habit_id, (map.get(l.habit_id) ?? new Set()).add(l.log_date))
    return map
  }, [optimisticLogs])

  // vacation days and per-habit repaired days (both keep streaks alive)
  const pausedDays = useMemo(() => bridgesFor("", [], pauses), [pauses])
  const repairedByHabit = useMemo(() => {
    const map = new Map<string, Set<ISODate>>()
    for (const r of repairs) map.set(r.habit_id, (map.get(r.habit_id) ?? new Set()).add(r.day))
    return map
  }, [repairs])
  const activePause = pauses.find((p) => p.start_date <= today && p.end_date >= today)
  const pauseReason = asPauseReason(activePause?.reason)
  // why each paused day was paused (for the 7-day strip's labels)
  const pauseReasonByDay = useMemo(() => {
    const map = new Map<ISODate, PauseReason>()
    for (const p of pauses) for (const d of daysBetween(p.start_date, p.end_date)) map.set(d, asPauseReason(p.reason))
    return map
  }, [pauses])
  const bridgesOf = (habitId: string) => new Set<ISODate>([...pausedDays, ...(repairedByHabit.get(habitId) ?? [])])

  const perDay = useMemo(() => {
    const map = new Map<ISODate, number>()
    for (const [, days] of byHabit) for (const d of days) map.set(d, (map.get(d) ?? 0) + 1)
    return map
  }, [byHabit])

  // bumped when a check-in completes the day → plays the celebration once
  const [celebration, setCelebration] = useState(0)

  const onToggle = (habitId: string, tappedDate: ISODate, tappedDone: boolean, mini = false) => {
    let date = tappedDate
    let done = tappedDone
    // The screen was rendered before midnight and is still open: a tap on
    // "today" means the new day, not yesterday. Re-render for the new day too.
    const nowDay = clientToday()
    if (date === today && nowDay > today) {
      date = nowDay
      done = true
      router.refresh()
    }
    const habit = habits.find((h) => h.id === habitId)
    const days = byHabit.get(habitId)
    // comeback bonus: the first check-in after a missed day is celebrated on its own
    // (freezes and repairs protect a streak; this rewards the return itself)
    if (done && date === today && habit && days && habit.target_per_week >= 7 && canComeBackToday(days, today, bridgesOf(habitId))) {
      const withToday = new Set(days).add(today)
      const n = comebackDays(withToday, bridgesOf(habitId)).length
      const quick = isQuickComeback(withToday, today, bridgesOf(habitId))
      toast.success(t.comeback.title, { description: quick ? t.comeback.quick : t.comeback.text(n), duration: 6000 })
      setCelebration((c) => c + 1)
    }
    if (done && date === today && !byHabit.get(habitId)?.has(today)) {
      const stillDue = habits.filter((h) => h.id !== habitId && isDueToday(byHabit.get(h.id)!, today, h.target_per_week))
      if (stillDue.length === 0) setCelebration((n) => n + 1)
    }
    if (!navigator.onLine) {
      // ask the browser not to evict the queue (iOS clears storage of unused sites)
      navigator.storage?.persist?.().catch(() => {})
      return void updateQueue((q) => enqueue(q, { habitId, date, done, mini }))
    }
    startTransition(async () => {
      applyToggle({ habitId, date, done, mini })
      try {
        const res = await toggleHabitLog(habitId, date, done, mini)
        if (!res.ok) toast.error(res.error)
      } catch {
        // the request never reached the server: keep it for later
        updateQueue((q) => enqueue(q, { habitId, date, done, mini }))
      }
    })
  }

  const doneToday = habits.filter((h) => byHabit.get(h.id)?.has(today)).length
  // nothing is "due" on vacation
  // graduated habits run on autopilot — never "due"
  const activeHabits = habits.filter((h) => !h.graduated_at)
  const autopilot = habits.filter((h) => h.graduated_at)
  const leftNow = activePause ? 0 : activeHabits.filter((h) => isDueToday(byHabit.get(h.id)!, today, h.target_per_week)).length

  // "N left today" on the installed app's icon
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    if (!nav.setAppBadge) return
    void (leftNow > 0 ? nav.setAppBadge(leftNow) : nav.clearAppBadge?.())?.catch(() => {})
  }, [leftNow])

  // a check-in from a notification button → fetch fresh data
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "checked-in") router.refresh()
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [router])
  // weekly habits whose target is already met aren't "left" for today
  const leftToday = activeHabits.filter((h) => isDueToday(byHabit.get(h.id)!, today, h.target_per_week)).length
  const best = habits
    .map((h) => habitStreak(byHabit.get(h.id)!, today, h.target_per_week, bridgesOf(h.id)))
    .sort((a, b) => (b.unit === "day" ? b.current : b.current * 7) - (a.unit === "day" ? a.current : a.current * 7))[0]
  const bestStreak = t.dashboard.streakShort(best?.current ?? 0, best?.unit ?? "day")
  const rate30 = habits.length
    ? habits.reduce((s, h) => s + completionRate(byHabit.get(h.id)!, today, 30, h.created_at.slice(0, 10), h.target_per_week, bridgesOf(h.id)), 0) /
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
  const insights = useMemo(
    () =>
      findInsights(
        habits.map((h) => ({
          id: h.id,
          name: h.name,
          target: h.target_per_week,
          createdOn: h.created_at.slice(0, 10) as ISODate,
          done: byHabit.get(h.id)!,
          hasPlan: Boolean(h.cue),
        })),
        today,
        3,
        new Map(Object.entries(feelings) as [ISODate, DayFeeling][])
      ),
    [habits, byHabit, today, feelings]
  )
  const totalCheckIns = [...perDay.values()].reduce((a, b) => a + b, 0)

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
            ) : activePause && leftToday > 0 ? (
              t.vacation.heading[pauseReason]
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
        <div className="flex gap-2">
          {habits.length > 0 && (
            <Button variant="outline" onClick={() => setShareOpen(true)}>
              <Share2Icon aria-hidden /> <span className="max-sm:sr-only">{t.share.button}</span>
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon /> {t.dashboard.newHabit}
          </Button>
        </div>
      </div>
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />

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
          {/* one quiet summary line — the habits below are the main thing */}
          <SummaryStrip
            items={[
              { label: t.dashboard.statToday, value: `${doneToday}/${habits.length}` },
              { label: t.dashboard.statBestStreak, value: bestStreak },
              { label: t.dashboard.statCompletion, value: `${Math.round(rate30 * 100)}%` },
              { label: t.dashboard.statCheckIns, value: String(totalCheckIns) },
            ]}
          />

          {activePause && (
            <p
              role="status"
              className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"
            >
              <TreePalmIcon className="size-4 shrink-0" />
              <span className="flex-1">
                {t.vacation.active[pauseReason](formatDay(locale, activePause.end_date, { month: "long", day: "numeric" }))}
              </span>
              <Link href="/settings#vacation" className="font-medium underline underline-offset-4">
                {t.vacation.end[pauseReason]}
              </Link>
            </p>
          )}

          {(!online || queue.length > 0) && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"
            >
              <CloudOffIcon className="size-4 shrink-0" />
              {online ? t.offline.syncing(queue.length) : t.offline.offline(queue.length)}
            </p>
          )}

          <SortableHabits
            habits={activeHabits}
            onReorder={onReorder}
            renderHabit={(h, dragHandle) => (
              <HabitCard
                habit={h}
                done={byHabit.get(h.id)!}
                mini={miniByHabit.get(h.id)}
                paused={pausedDays}
                pauseReasons={pauseReasonByDay}
                repaired={repairedByHabit.get(h.id)}
                strength={strength[h.id]}
                today={today}
                onToggle={onToggle}
                todayNote={todayNotes[h.id]}
                dragHandle={activeHabits.length > 1 ? dragHandle : undefined}
              />
            )}
          />

          {autopilot.length > 0 && (
            <details className="group rounded-xl border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <IconTile icon={GraduationCapIcon} tone="emerald" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {t.strength.autopilot} <span className="text-muted-foreground tabular-nums">· {autopilot.length}</span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{t.strength.autopilotSub}</span>
                </span>
                <ChevronRightIcon className="size-5 text-muted-foreground transition group-open:rotate-90" />
              </summary>
              <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
                {autopilot.map((h) => (
                  <HabitCard
                    key={h.id}
                    habit={h}
                    done={byHabit.get(h.id)!}
                    mini={miniByHabit.get(h.id)}
                    paused={pausedDays}
                pauseReasons={pauseReasonByDay}
                    repaired={repairedByHabit.get(h.id)}
                    today={today}
                    onToggle={onToggle}
                    todayNote={todayNotes[h.id]}
                  />
                ))}
              </div>
            </details>
          )}

          <FeelingCard today={feelings[today] ?? { mood: null, energy: null }} />

          {pacts.length > 0 && (
            <PactsCard
              pacts={pacts}
              byHabit={byHabit}
              today={today}
              habits={habits.map((h) => ({ id: h.id, name: h.name, color: h.color }))}
            />
          )}
          {challenges.length > 0 && (
            <ChallengesCard challenges={challenges} habits={habits.map((h) => ({ id: h.id, name: h.name, color: h.color }))} />
          )}

          <Link
            href="/progress"
            className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium">{t.progress.teaserTitle}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {review.rate === null ? t.progress.teaserEmpty : t.progress.teaser(Math.round(review.rate * 100), insights.length)}
            </span>
            <ChevronRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
          </Link>

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
