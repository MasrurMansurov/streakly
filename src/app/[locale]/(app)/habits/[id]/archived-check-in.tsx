"use client"

import { CheckIcon } from "lucide-react"
import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { toggleHabitLog } from "@/app/actions/habits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { addDays, type ISODate } from "@/lib/dates"
import { clientToday } from "@/lib/day-start-client"
import { habitColor } from "@/lib/habit-colors"
import { cn } from "@/lib/utils"

type Props = { habitId: string; color: string; today: ISODate; createdOn: ISODate; done: ISODate[] }

/**
 * Check-ins for an archived habit. It stays off the dashboard, the public
 * profile and reminders — but it can still be checked off here, for today
 * and the last 7 days (like the week strip on the dashboard).
 */
export function ArchivedCheckIn({ habitId, color, today, createdOn, done }: Props) {
  const { t, locale } = useI18n()
  const [, startTransition] = useTransition()
  const [days, toggle] = useOptimistic(new Set(done), (state: Set<ISODate>, { date, on }: { date: ISODate; on: boolean }) => {
    const next = new Set(state)
    if (on) next.add(date)
    else next.delete(date)
    return next
  })
  const c = habitColor(color)
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const doneToday = days.has(today)

  const set = (date: ISODate, on: boolean) =>
    startTransition(async () => {
      // the page may have been open since before the day changed
      const now = clientToday()
      const day = date === today && now > today ? now : date
      toggle({ date: day, on })
      const res = await toggleHabitLog(habitId, day, on)
      if (!res.ok) toast.error(res.error)
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.archivedCheckIn.title}</CardTitle>
        <CardDescription>{t.archivedCheckIn.hint}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          variant={doneToday ? "outline" : "default"}
          className="w-fit"
          aria-pressed={doneToday}
          onClick={() => set(today, !doneToday)}
        >
          <CheckIcon /> {doneToday ? t.archivedCheckIn.doneToday : t.archivedCheckIn.today}
        </Button>
        <div className="grid max-w-sm grid-cols-7 gap-1.5">
          {week.map((date) => {
            const isDone = days.has(date)
            const short = formatDay(locale, date, { weekday: "short" }).slice(0, 2)
            const long = formatDay(locale, date, { weekday: "long", month: "short", day: "numeric" })
            return (
              <button
                key={date}
                type="button"
                disabled={date < createdOn}
                aria-pressed={isDone}
                aria-label={`${short} — ${t.habit.dayStatus(long, isDone)}`}
                onClick={() => set(date, !isDone)}
                className="group flex flex-col items-center gap-1 disabled:opacity-40"
              >
                <span className="text-[10px] text-muted-foreground uppercase">{short}</span>
                <span
                  className={cn(
                    "flex h-6 w-full items-center justify-center rounded-md transition group-enabled:group-hover:opacity-80",
                    isDone ? cn(c.soft, c.text) : "bg-muted",
                    date === today && "ring-2 ring-foreground/20 ring-offset-1 ring-offset-background"
                  )}
                >
                  {isDone && <CheckIcon className="size-3.5" strokeWidth={2.5} aria-hidden />}
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
