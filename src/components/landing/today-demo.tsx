"use client"

import { CheckIcon, FlameIcon } from "lucide-react"
import { useState } from "react"

import { ConfettiBurst } from "@/components/confetti-burst"
import { Link } from "@/components/link"
import { useI18n } from "@/i18n/client"
import { cn } from "@/lib/utils"

/** The three sample habits: daily streaks or a weekly goal, with the week so far (Mon…Sat; Sunday is today). */
const HABITS = [
  { color: "bg-emerald-500", soft: "bg-emerald-500/55", streak: 16, weekly: false, week: [1, 1, 1, 1, 1, 1], done: false },
  { color: "bg-sky-500", soft: "bg-sky-500/55", streak: 2, weekly: true, week: [1, 0, 1, 0, 0, 0], done: true },
  { color: "bg-rose-500", soft: "bg-rose-500/55", streak: 23, weekly: false, week: [1, 1, 1, 1, 1, 1], done: false },
] as const

/**
 * The hero's live mini "Today" card: tap a circle — the check fills, the
 * streak grows by one, today's cell in the week lights up, confetti. The
 * server renders the same first frame (no layout shift, the H1 stays the LCP).
 * Nothing moves on its own; with reduced motion the confetti is skipped.
 */
export function TodayDemo() {
  const { t } = useI18n()
  const d = t.landing.liveDemo
  const [done, setDone] = useState<boolean[]>(HABITS.map((h) => h.done))
  const [burst, setBurst] = useState<number[]>(HABITS.map(() => 0))
  const [announce, setAnnounce] = useState("")
  const left = done.filter((x) => !x).length

  const label = (i: number, isDone: boolean) => {
    const h = HABITS[i]
    return h.weekly ? d.weekly(h.week.filter(Boolean).length + (isDone ? 1 : 0)) : d.streak(h.streak + (isDone ? 1 : 0))
  }

  const toggle = (i: number) => {
    const next = !done[i]
    setDone((cur) => cur.map((x, j) => (j === i ? next : x)))
    if (next) setBurst((cur) => cur.map((x, j) => (j === i ? x + 1 : x)))
    setAnnounce(d.announce(d.habits[i], label(i, next)))
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_2px_oklch(0_0_0/0.04),0_8px_24px_-12px_oklch(0.3_0.05_165/0.18)]">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">{d.day}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{d.left(left)}</span>
        </div>
        <ul className="mt-3 divide-y">
          {HABITS.map((h, i) => {
            const isDone = done[i]
            return (
              <li key={i} className="flex items-center gap-3 py-3">
                <button
                  type="button"
                  aria-pressed={isDone}
                  aria-label={isDone ? d.unmark(d.habits[i]) : d.mark(d.habits[i])}
                  onClick={() => toggle(i)}
                  className={cn(
                    "relative flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,border-color,transform] duration-200 ease-out active:scale-90",
                    isDone ? cn("border-transparent text-white", h.color) : "border-muted-foreground/35 hover:border-muted-foreground/60"
                  )}
                >
                  <CheckIcon
                    className={cn("size-5 transition-[opacity,transform] duration-200 ease-out", isDone ? "scale-100 opacity-100" : "scale-50 opacity-0")}
                    strokeWidth={3}
                    aria-hidden
                  />
                  {burst[i] > 0 && <ConfettiBurst key={burst[i]} />}
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug font-medium">{d.habits[i]}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    <FlameIcon className={cn("size-3", isDone ? "text-orange-500" : "text-orange-500/70")} aria-hidden />
                    {label(i, isDone)}
                  </span>
                </span>
                <span className="flex shrink-0 gap-0.5 sm:gap-1" aria-hidden>
                  {[...h.week, isDone ? 1 : 0].map((on, day) => (
                    <span
                      key={day}
                      className={cn(
                        "size-2.5 rounded-[3px] transition-colors duration-300 sm:size-3",
                        on ? (day === 6 ? h.color : h.soft) : "bg-muted",
                        day === 6 && "ring-1 ring-foreground/15 ring-offset-1 ring-offset-card"
                      )}
                    />
                  ))}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-1 min-h-5 text-xs text-muted-foreground">{left === 0 ? d.allDone : d.hint}</p>
        {/* one polite announcement with the final value (never the animating number) */}
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>
      </div>
      <Link href="/demo" className="justify-self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        {d.full} →
      </Link>
    </div>
  )
}
