"use client"

import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { useOptimistic, useState, useTransition } from "react"
import { toast } from "sonner"

import { toggleHabitStep } from "@/app/actions/habits"
import { useI18n } from "@/i18n/client"
import type { ISODate } from "@/lib/dates"
import type { habitColor } from "@/lib/habit-colors"
import { cn } from "@/lib/utils"

type Props = {
  steps: { id: string; title: string }[]
  /** steps ticked today on the server */
  doneIds: string[]
  /** the day's check-in: a full one ticks every step, none clears them */
  state: "full" | "mini" | "none"
  today: ISODate
  color: ReturnType<typeof habitColor>
}

/**
 * The steps of a habit on its card. Ticking all = done, some = mini (the
 * streak goes on) — the database settles it. One tap on the card still does
 * everything at once.
 */
export function HabitSteps({ steps, doneIds, state, today, color }: Props) {
  const { t } = useI18n()
  const base = state === "full" ? steps.map((s) => s.id) : state === "none" ? [] : doneIds
  const [ticked, setTicked] = useOptimistic(new Set(base), (cur: Set<string>, { id, on }: { id: string; on: boolean }) => {
    const next = new Set(cur)
    if (on) next.add(id)
    else next.delete(id)
    return next
  })
  const [, start] = useTransition()
  // open while there's something left to do; the person can fold it either way
  const [open, setOpen] = useState(state !== "full")
  const done = steps.filter((s) => ticked.has(s.id)).length

  const toggle = (id: string, on: boolean) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return void toast.error(t.steps.offline)
    start(async () => {
      setTicked({ id, on })
      const res = await toggleHabitStep(id, today, on)
      if (!res.ok) toast.error(res.error)
    })
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className={cn("font-medium tabular-nums", done === steps.length && color.text)}>{t.steps.progress(done, steps.length)}</span>
        <ChevronDownIcon className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
        <span className="sr-only">{open ? t.steps.hide : t.steps.show}</span>
      </button>
      {open && (
        <ul className="mt-1.5 grid gap-0.5">
          {steps.map((s) => {
            const on = ticked.has(s.id)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={on ? t.steps.stepDone(s.title) : t.steps.stepTodo(s.title)}
                  onClick={() => toggle(s.id, !on)}
                  className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  <span
                    className={cn(
                      "flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      on ? cn(color.soft, color.text, "border-transparent") : "border-muted-foreground/40"
                    )}
                    aria-hidden
                  >
                    {on && <CheckIcon className="size-3" strokeWidth={3} />}
                  </span>
                  <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", on && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                    {s.title}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
