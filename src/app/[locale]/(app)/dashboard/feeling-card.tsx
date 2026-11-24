"use client"

import { BatteryMediumIcon, SmileIcon } from "lucide-react"
import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { saveFeeling } from "@/app/actions/wellbeing"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/i18n/client"
import { cn } from "@/lib/utils"

type Feeling = { mood: number | null; energy: number | null }

const MOOD_COLORS = ["bg-rose-500", "bg-orange-500", "bg-amber-400", "bg-lime-500", "bg-emerald-500"]
const ENERGY_COLORS = ["bg-slate-500", "bg-sky-300", "bg-sky-400", "bg-sky-500", "bg-sky-600"]

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

  const row = (key: "mood" | "energy", label: string, scale: string[], colors: string[], Icon: typeof SmileIcon) => (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon className="size-3.5" /> {label}
        </span>
        {value[key] && <span className="font-medium text-foreground">{scale[value[key]! - 1]}</span>}
      </div>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
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
                "h-7 rounded-md transition",
                on ? colors[i] : value[key] && level < value[key]! ? cn(colors[i], "opacity-35") : "bg-muted hover:bg-muted-foreground/20"
              )}
            />
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
        {row("mood", t.feeling.mood, t.feeling.moodScale, MOOD_COLORS, SmileIcon)}
        {row("energy", t.feeling.energy, t.feeling.energyScale, ENERGY_COLORS, BatteryMediumIcon)}
      </div>
    </Card>
  )
}
