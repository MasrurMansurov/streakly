"use client"

import { BatteryMediumIcon, SmileIcon } from "lucide-react"
import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { saveFeeling } from "@/app/actions/wellbeing"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/i18n/client"
import { cn } from "@/lib/utils"

type Feeling = { mood: number | null; energy: number | null }

/** "How are you today?" — mood and energy, one tap each. */
export function FeelingCard({ today }: { today: Feeling }) {
  const { t } = useI18n()
  const [value, setValue] = useOptimistic(today)
  const [, start] = useTransition()

  const pick = (key: "mood" | "energy", level: number) =>
    start(async () => {
      setValue({ ...value, [key]: level })
      const res = await saveFeeling({ [key]: level })
      if (!res.ok) toast.error(res.error)
    })

  const row = (key: "mood" | "energy", label: string, scale: string[], Icon: typeof SmileIcon) => (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon className="size-3.5" /> {label}
        </span>
        {value[key] && <span className="font-medium text-foreground">{scale[value[key]! - 1]}</span>}
      </div>
      {/* a 1–5 segmented scale: the numbers are visible, the chosen one is filled — one color, no rainbow */}
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 rounded-lg border bg-card p-0.5">
        {scale.map((name, i) => {
          const level = i + 1
          const on = value[key] === level
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${label}: ${name}`}
              title={name}
              onClick={() => pick(key, level)}
              className={cn(
                "h-8 rounded-md text-sm tabular-nums transition-colors duration-150",
                on ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {level}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-sm font-medium">{t.feeling.title}</h2>
        {!value.mood && !value.energy && <span className="text-xs text-muted-foreground">{t.feeling.hint}</span>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {row("mood", t.feeling.mood, t.feeling.moodScale, SmileIcon)}
        {row("energy", t.feeling.energy, t.feeling.energyScale, BatteryMediumIcon)}
      </div>
    </Card>
  )
}
