"use client"

import { CheckIcon } from "lucide-react"

import { habitColor } from "@/lib/habit-colors"
import { cn } from "@/lib/utils"

export type HabitChoice = { id: string; name: string; color: string }

/** Pick one of your habits (radio group styled as chips). */
export function HabitPicker({
  habits,
  value,
  onChange,
  label,
}: {
  habits: HabitChoice[]
  value: string | null
  onChange: (id: string) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {habits.map((h) => {
        const selected = value === h.id
        return (
          <button
            key={h.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(h.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition outline-none",
              "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
              selected && "border-foreground/40 bg-muted font-medium"
            )}
          >
            {selected ? <CheckIcon className="size-3.5" /> : <span className={cn("size-2 rounded-full", habitColor(h.color).dot)} />}
            {h.name}
          </button>
        )
      })}
    </div>
  )
}
