"use client"

import { ArchiveIcon, CheckIcon, FlameIcon, SnowflakeIcon, MessageSquarePlusIcon, StickyNoteIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useState, useTransition, type ReactNode } from "react"
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
import { countInWeek, FREEZES_PER_MONTH, habitStreak, weekStart } from "@/lib/streaks"
import { cn } from "@/lib/utils"

import { HabitFormDialog } from "./habit-form-dialog"

type Props = {
  habit: Habit
  done: ReadonlySet<ISODate>
  today: ISODate
  onToggle: (habitId: string, date: ISODate, done: boolean) => void
  /** drag handle rendered next to the menu (from the sortable wrapper) */
  dragHandle?: ReactNode
  todayNote?: string
}

export function HabitCard({ habit, done, today, onToggle, dragHandle, todayNote }: Props) {
  const { locale, t } = useI18n()
  const color = habitColor(habit.color)
  const target = habit.target_per_week
  const streak = habitStreak(done, today, target)
  const thisWeek = countInWeek(done, weekStart(today))
  const doneToday = done.has(today)
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
    <Card className={cn("gap-0 p-4 transition-all duration-300 hover:shadow-md", doneToday && color.soft)}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => {
            if (!doneToday) setBursts((n) => n + 1)
            onToggle(habit.id, today, !doneToday)
          }}
          aria-pressed={doneToday}
          aria-label={doneToday ? t.habit.markUndone(habit.name) : t.habit.markDone(habit.name)}
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90",
            doneToday ? cn(color.dot, "border-transparent text-white") : "border-muted-foreground/30 hover:border-muted-foreground/60"
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

      {/* last 7 days — click to fix a missed check-in */}
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {week.map((date) => {
          const isDone = done.has(date)
          const isFrozen = !isDone && Boolean(streak.frozen?.has(date))
          const beforeCreated = date < createdOn
          return (
            <button
              key={date}
              type="button"
              disabled={beforeCreated}
              onClick={() => onToggle(habit.id, date, !isDone)}
              aria-pressed={isDone}
              aria-label={
                isFrozen
                  ? t.habit.frozenDay(formatDay(locale, date, { weekday: "long", month: "short", day: "numeric" }))
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
                  isDone ? color.dot : isFrozen ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-muted",
                  date === today && "ring-2 ring-foreground/20 ring-offset-1 ring-offset-background"
                )}
              >
                {isFrozen && <SnowflakeIcon className="size-3.5" aria-hidden />}
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
