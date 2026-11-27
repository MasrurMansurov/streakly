"use client"

import { CheckIcon, PlusIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createHabit } from "@/app/actions/habits"
import { IconTile, type IconTone } from "@/components/icon-tile"
import { useI18n } from "@/i18n/client"
import { HABIT_TEMPLATES, type TemplateKey } from "@/lib/templates"
import { cn } from "@/lib/utils"

/** habit colour → tile tone */
const TONE: Record<string, IconTone> = {
  emerald: "emerald",
  sky: "sky",
  violet: "violet",
  rose: "rose",
  amber: "amber",
  slate: "muted",
}

/** One-tap starter habits for the empty dashboard. */
export function HabitTemplates() {
  const { t } = useI18n()
  const [added, setAdded] = useState<TemplateKey[]>([])
  const [pending, startTransition] = useTransition()

  const add = (key: TemplateKey) =>
    startTransition(async () => {
      const tpl = HABIT_TEMPLATES.find((x) => x.key === key)!
      const item = t.templates.items[key]
      const res = await createHabit({
        name: item.name,
        description: item.description,
        mini_label: item.mini,
        cue: item.cue,
        color: tpl.color,
        target_per_week: tpl.target,
      })
      if (!res.ok) return void toast.error(res.error)
      setAdded((a) => [...a, key])
      toast.success(t.templates.added(item.name))
    })

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {HABIT_TEMPLATES.map(({ key, icon, color, target }) => {
        const item = t.templates.items[key]
        const done = added.includes(key)
        return (
          <button
            key={key}
            type="button"
            disabled={pending || done}
            onClick={() => add(key)}
            className={cn(
              "group flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition outline-none",
              "hover:border-foreground/20 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:cursor-default",
              done && "border-done/40 bg-done-soft"
            )}
          >
            <IconTile icon={icon} tone={TONE[color]} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{item.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {target < 7 ? t.habit.timesWeek(target) : t.habit.everyDay} · {item.description}
              </span>
            </span>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border transition",
                done ? "border-transparent bg-done text-white dark:text-background" : "text-muted-foreground group-hover:bg-muted"
              )}
            >
              {done ? <CheckIcon className="size-4" /> : <PlusIcon className="size-4" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
