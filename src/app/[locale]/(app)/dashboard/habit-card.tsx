"use client"

import { ArchiveIcon, CheckIcon, FlameIcon, SnowflakeIcon, TreePalmIcon, WrenchIcon, MessageSquarePlusIcon, StickyNoteIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useState, useTransition, type ReactNode, useMemo } from "react"
import { toast } from "sonner"

import { archiveHabit, deleteHabit, restoreHabit } from "@/app/actions/habits"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Habit } from "@/lib/data"
import { ConfettiBurst } from "@/components/confetti-burst"
import { Link } from "@/components/link"
import { NoteDialog } from "@/components/note-dialog"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { addDays, type ISODate } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { countInWeek, FREEZES_PER_MONTH, habitStreak, repairCandidate, weekStart } from "@/lib/streaks"
import { repairStreak } from "@/app/actions/streaks"
import { cn } from "@/lib/utils"

import { HabitFormDialog } from "./habit-form-dialog"

type Props = {
  habit: Habit
  done: ReadonlySet<ISODate>
  /** days done in the mini version */
  mini?: ReadonlySet<ISODate>
  /** vacation days (never break a streak) */
  paused?: ReadonlySet<ISODate>
  /** repaired days of this habit */
  repaired?: ReadonlySet<ISODate>
  today: ISODate
  onToggle: (habitId: string, date: ISODate, done: boolean, mini?: boolean) => void
  /** drag handle rendered next to the menu (from the sortable wrapper) */
  dragHandle?: ReactNode
  todayNote?: string
}

export function HabitCard({ habit, done, mini, paused, repaired, today, onToggle, dragHandle, todayNote }: Props) {
  const { locale, t } = useI18n()
  const color = habitColor(habit.color)
  const target = habit.target_per_week
  const bridges = useMemo(() => new Set<ISODate>([...(paused ?? []), ...(repaired ?? [])]), [paused, repaired])
  const streak = habitStreak(done, today, target, bridges)
  const repairedThisMonth = [...(repaired ?? [])].some((d) => d.startsWith(today.slice(0, 7)))
  const repair = target >= 7 && !paused?.has(today) ? repairCandidate(done, today, bridges, repairedThisMonth) : null
  // a recent break (last check-in within two weeks) of a streak worth caring about
  const lastDone = [...done].sort().at(-1)
  const recentlyBroken =
    !repair && streak.current === 0 && streak.best >= 3 && lastDone !== undefined && lastDone >= addDays(today, -14)
  const thisWeek = countInWeek(done, weekStart(today))
  const doneToday = done.has(today)
  const miniToday = doneToday && Boolean(mini?.has(today))
  const createdOn = habit.created_at.slice(0, 10)
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  const [editOpen, setEditOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  // bumped on every check-in → replays the pop + confetti
  const [bursts, setBursts] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const res = await action()
      if (res.ok) toast.success(success)
      else toast.error(res.error ?? t.common.somethingWrong)
    })

  return (
    <Card
      id={`habit-${habit.id}`}
      className={cn(
        "scroll-mt-24 gap-0 p-4 transition-all duration-300 hover:shadow-md target:ring-2 target:ring-emerald-500/50",
        doneToday && color.soft
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => {
            if (!doneToday || miniToday) setBursts((n) => n + 1)
            // mini → full upgrade; otherwise toggle
            onToggle(habit.id, today, miniToday ? true : !doneToday)
          }}
          aria-pressed={doneToday && !miniToday}
          aria-label={doneToday && !miniToday ? t.habit.markUndone(habit.name) : t.habit.markDone(habit.name)}
          title={miniToday ? t.habit.miniDoneHint : undefined}
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90",
            doneToday
              ? cn(color.dot, "border-transparent text-white", miniToday && "opacity-55")
              : "border-muted-foreground/30 hover:border-muted-foreground/60"
          )}
        >
          <CheckIcon
            key={bursts}
            className={cn(
              "size-5 transition",
              doneToday ? "opacity-100" : "opacity-0",
              bursts > 0 && doneToday && "motion-safe:animate-pop"
            )}
          />
          {bursts > 0 && doneToday && <ConfettiBurst key={bursts} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 shrink-0 rounded-full", color.dot)} />
            <h3 className="truncate font-medium">
              <Link href={`/habits/${habit.id}`} className="hover:underline">
                {habit.name}
              </Link>
            </h3>
          </div>
          {habit.description && <p className="mt-0.5 truncate text-sm text-muted-foreground">{habit.description}</p>}
          {habit.mini_label && !doneToday && (
            <button
              type="button"
              onClick={() => {
                setBursts((n) => n + 1)
                onToggle(habit.id, today, true, true)
              }}
              aria-label={t.habit.markMini(habit.name, habit.mini_label)}
              className={cn(
                "mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs transition",
                "text-muted-foreground hover:border-solid hover:text-foreground"
              )}
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", color.dot)} />
              <span className="truncate">{t.habit.miniDo(habit.mini_label)}</span>
            </button>
          )}
          {miniToday && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className={cn("mr-1 rounded-full px-1.5 py-0.5 font-medium", color.soft, color.text)}>{t.habit.miniDone}</span>
              {t.habit.miniDoneHint}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className={cn("inline-flex items-center gap-1 font-medium", streak.current > 0 && color.text)}>
              <FlameIcon className={cn("size-3.5", streak.current === 0 ? "text-muted-foreground/60" : "text-orange-500")} />
              {t.habit.streak(streak.current, streak.unit)}
            </span>
            {streak.freezesUsed !== undefined && streak.freezesUsed > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400"
                title={t.habit.freezesHint(FREEZES_PER_MONTH - streak.freezesUsed)}
                aria-label={t.habit.freezesHint(FREEZES_PER_MONTH - streak.freezesUsed)}
              >
                <SnowflakeIcon className="size-3.5" />
                {t.habit.freezes(streak.freezesUsed, FREEZES_PER_MONTH)}
              </span>
            )}
            {target < 7 && (
              <span className={cn(thisWeek >= target && "font-medium text-foreground")}>
                {t.habit.thisWeek(Math.min(thisWeek, target), target)}
              </span>
            )}
            <span>
              {t.habit.best}: {streak.best}
            </span>
          </div>
        </div>

        {doneToday && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={todayNote ? t.notes.edit : t.notes.add}
            title={todayNote ?? t.notes.add}
            className={cn(todayNote ? color.text : "text-muted-foreground")}
            onClick={() => setNoteOpen(true)}
          >
            {todayNote ? <StickyNoteIcon /> : <MessageSquarePlusIcon />}
          </Button>
        )}
        {dragHandle}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label={t.habit.actions} disabled={pending} />}
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <PencilIcon /> {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                startTransition(async () => {
                  const res = await archiveHabit(habit.id)
                  if (!res.ok) return void toast.error(res.error)
                  toast.success(t.habit.archivedToast(habit.name), {
                    action: { label: t.habit.undo, onClick: () => startTransition(async () => void (await restoreHabit(habit.id))) },
                  })
                })
              }
            >
              <ArchiveIcon /> {t.common.archive}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon /> {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {repair ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t.repair.offer(repair.streak)}</p>
            <p className="text-xs text-muted-foreground">{t.repair.hint}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => repairStreak(habit.id, repair.day), t.repair.done)}
          >
            <WrenchIcon /> {t.repair.button}
          </Button>
        </div>
      ) : recentlyBroken && !doneToday ? (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {t.comeback.broken(streak.best)}
        </p>
      ) : null}

      {/* last 7 days — click to fix a missed check-in */}
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {week.map((date) => {
          const isDone = done.has(date)
          const isMini = isDone && Boolean(mini?.has(date))
          const isPaused = !isDone && Boolean(paused?.has(date))
          const isRepaired = !isDone && !isPaused && Boolean(repaired?.has(date))
          const isFrozen = !isDone && !isPaused && !isRepaired && Boolean(streak.frozen?.has(date))
          const beforeCreated = date < createdOn
          return (
            <button
              key={date}
              type="button"
              disabled={beforeCreated}
              onClick={() => onToggle(habit.id, date, !isDone)}
              aria-pressed={isDone}
              aria-label={
                isPaused
                  ? t.vacation.dayStatus(formatDay(locale, date, { weekday: "long", month: "short", day: "numeric" }))
                  : isRepaired
                    ? t.repair.dayStatus(formatDay(locale, date, { weekday: "long", month: "short", day: "numeric" }))
                    : isFrozen
                  ? t.habit.frozenDay(formatDay(locale, date, { weekday: "long", month: "short", day: "numeric" }))
                  : isMini
                    ? t.habit.miniDayStatus(formatDay(locale, date, { weekday: "long", month: "short", day: "numeric" }))
                    : t.habit.dayStatus(formatDay(locale, date, { weekday: "long", month: "short", day: "numeric" }), isDone)
              }
              className="group flex flex-col items-center gap-1 disabled:opacity-40"
            >
              <span className="text-[10px] text-muted-foreground uppercase">
                {formatDay(locale, date, { weekday: "short" }).slice(0, 2)}
              </span>
              <span
                className={cn(
                  "flex h-6 w-full items-center justify-center rounded-md transition group-enabled:group-hover:opacity-80",
                  isDone
                    ? cn(color.dot, isMini && "opacity-45")
                    : isPaused
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : isFrozen || isRepaired
                        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                        : "bg-muted",
                  date === today && "ring-2 ring-foreground/20 ring-offset-1 ring-offset-background"
                )}
              >
                {isFrozen && <SnowflakeIcon className="size-3.5" aria-hidden />}
                {isRepaired && <WrenchIcon className="size-3.5" aria-hidden />}
                {isPaused && <TreePalmIcon className="size-3.5" aria-hidden />}
              </span>
            </button>
          )
        })}
      </div>

      <HabitFormDialog open={editOpen} onOpenChange={setEditOpen} habit={habit} />
      <NoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        habitId={habit.id}
        habitName={habit.name}
        date={today}
        initialNote={todayNote ?? ""}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.habit.deleteTitle(habit.name)}</DialogTitle>
            <DialogDescription>
              {t.habit.deleteText}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setDeleteOpen(false)
                run(() => deleteHabit(habit.id), t.habit.deleted)
              }}
            >
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
