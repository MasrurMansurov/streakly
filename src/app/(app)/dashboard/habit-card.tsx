"use client"

import { ArchiveIcon, CheckIcon, FlameIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useState, useTransition, type ReactNode } from "react"
import { toast } from "sonner"

import { archiveHabit, deleteHabit } from "@/app/actions/habits"
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
import { addDays, formatDate, type ISODate } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { countInWeek, formatStreak, habitStreak, weekStart } from "@/lib/streaks"
import { cn } from "@/lib/utils"

import { HabitFormDialog } from "./habit-form-dialog"

type Props = {
  habit: Habit
  done: ReadonlySet<ISODate>
  today: ISODate
  onToggle: (habitId: string, date: ISODate, done: boolean) => void
  /** drag handle rendered next to the menu (from the sortable wrapper) */
  dragHandle?: ReactNode
}

export function HabitCard({ habit, done, today, onToggle, dragHandle }: Props) {
  const color = habitColor(habit.color)
  const target = habit.target_per_week
  const streak = habitStreak(done, today, target)
  const thisWeek = countInWeek(done, weekStart(today))
  const doneToday = done.has(today)
  const createdOn = habit.created_at.slice(0, 10)
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const res = await action()
      if (res.ok) toast.success(success)
      else toast.error(res.error ?? "Something went wrong")
    })

  return (
    <Card className={cn("gap-0 p-4 transition", doneToday && color.soft)}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(habit.id, today, !doneToday)}
          aria-pressed={doneToday}
          aria-label={doneToday ? `Mark "${habit.name}" as not done today` : `Mark "${habit.name}" as done today`}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-95",
            doneToday ? cn(color.dot, "border-transparent text-white") : "border-muted-foreground/30 hover:border-muted-foreground/60"
          )}
        >
          <CheckIcon className={cn("size-5 transition", doneToday ? "opacity-100" : "opacity-0")} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 shrink-0 rounded-full", color.dot)} />
            <h3 className="truncate font-medium">{habit.name}</h3>
          </div>
          {habit.description && <p className="mt-0.5 truncate text-sm text-muted-foreground">{habit.description}</p>}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className={cn("inline-flex items-center gap-1 font-medium", streak.current > 0 && color.text)}>
              <FlameIcon className="size-3.5" /> {formatStreak(streak)}
            </span>
            {target < 7 && (
              <span className={cn(thisWeek >= target && "font-medium text-foreground")}>
                {Math.min(thisWeek, target)}/{target} this week
              </span>
            )}
            <span>Best: {streak.best}</span>
          </div>
        </div>

        {dragHandle}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label="Habit actions" disabled={pending} />}
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(() => archiveHabit(habit.id), "Habit archived")}>
              <ArchiveIcon /> Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* last 7 days — click to fix a missed check-in */}
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {week.map((date) => {
          const isDone = done.has(date)
          const beforeCreated = date < createdOn
          return (
            <button
              key={date}
              type="button"
              disabled={beforeCreated}
              onClick={() => onToggle(habit.id, date, !isDone)}
              aria-pressed={isDone}
              aria-label={`${formatDate(date, { weekday: "long", month: "short", day: "numeric" })}: ${isDone ? "done" : "not done"}`}
              className="group flex flex-col items-center gap-1 disabled:opacity-40"
            >
              <span className="text-[10px] text-muted-foreground uppercase">
                {formatDate(date, { weekday: "narrow" })}
              </span>
              <span
                className={cn(
                  "h-6 w-full rounded-md transition group-enabled:group-hover:opacity-80",
                  isDone ? color.dot : "bg-muted",
                  date === today && "ring-2 ring-foreground/20 ring-offset-1 ring-offset-background"
                )}
              />
            </button>
          )
        })}
      </div>

      <HabitFormDialog open={editOpen} onOpenChange={setEditOpen} habit={habit} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{habit.name}”?</DialogTitle>
            <DialogDescription>
              This permanently removes the habit and all its history. Archive it instead if you might come back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setDeleteOpen(false)
                run(() => deleteHabit(habit.id), "Habit deleted")
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
