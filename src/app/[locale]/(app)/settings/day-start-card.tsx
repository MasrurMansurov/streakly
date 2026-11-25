"use client"

import { MoonStarIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { setDayStart } from "@/app/actions/day-start"
import { IconTile } from "@/components/icon-tile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { MAX_DAY_START_HOUR, type DayStart, type ISODate } from "@/lib/dates"
import { cn } from "@/lib/utils"

const HOURS = Array.from({ length: MAX_DAY_START_HOUR + 1 }, (_, h) => h)
export const hh = (h: number) => `${String(h).padStart(2, "0")}:00`

type Props = { dayStart: DayStart; today: ISODate; timeZone: string }

/** "My day ends at 3 a.m." — when a new day starts for streaks and reminders. */
export function DayStartCard({ dayStart, today, timeZone }: Props) {
  const { t, locale } = useI18n()
  const [pending, start] = useTransition()
  const pendingChange = dayStart.since !== undefined && today < dayStart.since

  const choose = (h: number) =>
    start(async () => {
      const res = await setDayStart(h)
      if (!res.ok) toast.error(res.error)
      else if (res.message) toast.success(res.message)
    })

  return (
    <Card id="day-start" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconTile icon={MoonStarIcon} tone="violet" size="sm" /> {t.dayStart.title}
        </CardTitle>
        <CardDescription>{t.dayStart.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div role="radiogroup" aria-label={t.dayStart.title} className="flex flex-wrap gap-1.5">
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={dayStart.h === h}
              disabled={pending}
              onClick={() => dayStart.h !== h && choose(h)}
              className={cn(
                "h-8 rounded-lg border px-2.5 text-sm tabular-nums transition",
                dayStart.h === h ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              {hh(h)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {pendingChange
            ? t.dayStart.pending(hh(dayStart.h), formatDay(locale, dayStart.since!, { month: "long", day: "numeric" }))
            : t.dayStart.current(hh(dayStart.h))}{" "}
          {t.dayStart.timeZone(timeZone)}
        </p>
      </CardContent>
    </Card>
  )
}
