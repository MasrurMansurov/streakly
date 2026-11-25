"use client"

import { BedIcon, ThermometerIcon, TreePalmIcon, type LucideIcon } from "lucide-react"
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
import { asPauseReason, PAUSE_REASONS, type PauseReason } from "@/lib/pause"
import { cn } from "@/lib/utils"

const ICONS: Record<PauseReason, LucideIcon> = { vacation: TreePalmIcon, sick: ThermometerIcon, rest: BedIcon }

type Props = { today: ISODate; pause: { id: string; start_date: ISODate; end_date: ISODate; reason?: string } | null }

export function VacationCard({ today, pause }: Props) {
  const { t, locale } = useI18n()
  const [end, setEnd] = useState<string>(addDays(today, 6))
  const [reason, setReason] = useState<PauseReason>("vacation")
  const activeReason = asPauseReason(pause?.reason)
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
            <p className="text-sm">{t.vacation.active[activeReason](formatDay(locale, pause.end_date, { month: "long", day: "numeric" }))}</p>
            <Button variant="outline" disabled={pending} onClick={() => run(() => endPause(pause.id))}>
              {t.vacation.end[activeReason]}
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => startPause(end, reason))
            }}
          >
            <div className="grid w-full gap-2">
              <Label id="pause-reason">{t.vacation.reasonLabel}</Label>
              <div role="radiogroup" aria-labelledby="pause-reason" className="flex flex-wrap gap-1.5">
                {PAUSE_REASONS.map((r) => {
                  const Icon = ICONS[r]
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={reason === r}
                      onClick={() => setReason(r)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition",
                        reason === r ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                      )}
                    >
                      <Icon className="size-4" /> {t.vacation.reasons[r]}
                    </button>
                  )
                })}
              </div>
            </div>
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
              {t.vacation.start[reason]}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
