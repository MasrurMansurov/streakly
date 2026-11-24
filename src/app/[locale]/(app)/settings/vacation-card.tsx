"use client"

import { TreePalmIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { endPause, startPause } from "@/app/actions/streaks"
import { IconTile } from "@/components/icon-tile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { addDays, type ISODate } from "@/lib/dates"

type Props = { today: ISODate; pause: { id: string; start_date: ISODate; end_date: ISODate } | null }

export function VacationCard({ today, pause }: Props) {
  const { t, locale } = useI18n()
  const [end, setEnd] = useState<string>(addDays(today, 6))
  const [pending, start] = useTransition()

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error)
      else if (res.message) toast.success(res.message)
    })

  return (
    <Card id="vacation" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconTile icon={TreePalmIcon} tone="amber" size="sm" /> {t.vacation.title}
        </CardTitle>
        <CardDescription>{t.vacation.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {pause ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">{t.vacation.active(formatDay(locale, pause.end_date, { month: "long", day: "numeric" }))}</p>
            <Button variant="outline" disabled={pending} onClick={() => run(() => endPause(pause.id))}>
              {t.vacation.end}
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => startPause(end))
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="vacation-end">{t.vacation.until}</Label>
              <Input
                id="vacation-end"
                type="date"
                min={today}
                max={addDays(today, 30)}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-44"
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              {t.vacation.start}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
