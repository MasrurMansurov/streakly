import { CheckIcon, FlameIcon, SnowflakeIcon } from "lucide-react"
import type { ReactNode } from "react"

import { getDictionary, type Locale } from "@/i18n"
import { initials } from "@/lib/initials"
import { typo } from "@/lib/typography"
import { cn } from "@/lib/utils"

type Dict = ReturnType<typeof getDictionary>["landing"]["scenes"]

/** One day cell of the week strip — the product's own visual unit. */
function Cell({ state, today }: { state: "done" | "mini" | "freeze" | "empty"; today?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-6 items-center justify-center rounded-md sm:size-8",
        state === "done" && "bg-done text-primary-foreground dark:text-background",
        state === "mini" && "border border-done/40 bg-done-soft",
        state === "freeze" && "bg-freeze/15 text-freeze",
        state === "empty" && "border border-dashed border-muted-foreground/40",
        today && "ring-2 ring-foreground/20 ring-offset-2 ring-offset-card"
      )}
    >
      {state === "done" && <CheckIcon className="size-3.5" strokeWidth={3} />}
      {state === "mini" && <span className="size-2 rounded-full bg-done" />}
      {state === "freeze" && <SnowflakeIcon className="size-3.5" strokeWidth={2.25} />}
    </span>
  )
}

/** A fragment of the real interface, not an illustration (decorative: the text beside it says the same). */
function Fragment({ children, note }: { children: ReactNode; note: string }) {
  return (
    <div aria-hidden className="grid gap-3 rounded-2xl border bg-card p-4 shadow-raised sm:p-5">
      {children}
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  )
}

function Scene({ title, text, flip, children, locale }: { title: string; text: string; flip?: boolean; children: ReactNode; locale: Locale }) {
  return (
    <div className="grid items-center gap-8 sm:grid-cols-2 sm:gap-12">
      <div className={cn("grid max-w-md gap-3", flip && "sm:order-2")}>
        <h2 className="font-brand text-xl font-semibold tracking-[-0.01em] text-balance sm:text-2xl">{typo(locale, title)}</h2>
        <p className="leading-relaxed text-pretty text-muted-foreground">{typo(locale, text)}</p>
      </div>
      {children}
    </div>
  )
}

/** Three moments only Streakly has, each shown with the piece of UI that handles it. */
export function Scenes({ locale }: { locale: Locale }) {
  const d: Dict = getDictionary(locale).landing.scenes
  return (
    <div className="mx-auto grid max-w-5xl gap-20 px-4 py-20 sm:gap-24">
      <Scene title={d.freeze.title} text={d.freeze.text} locale={locale}>
        <Fragment note={d.freeze.note}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{d.freeze.habit}</span>
            <span className="flex items-center gap-1 text-sm font-semibold tabular-nums">
              <FlameIcon className="size-4 text-streak" /> {d.freeze.streak}
            </span>
          </div>
          <div className="flex gap-1 sm:gap-1.5">
            {(["done", "done", "freeze", "done", "done", "done", "done"] as const).map((s, i) => (
              <Cell key={i} state={s} today={i === 6} />
            ))}
          </div>
        </Fragment>
      </Scene>

      <Scene title={d.mini.title} text={d.mini.text} flip locale={locale}>
        <Fragment note={d.mini.note}>
          <span className="text-sm font-medium">{d.mini.habit}</span>
          <div className="grid grid-cols-2 rounded-lg border p-0.5 text-sm">
            <span className="rounded-md px-3 py-1.5 text-center text-muted-foreground">{d.mini.full}</span>
            <span className="rounded-md bg-muted px-3 py-1.5 text-center font-medium">{d.mini.min}</span>
          </div>
          <div className="flex gap-1 sm:gap-1.5">
            {(["done", "done", "mini", "done", "done", "done", "mini"] as const).map((s, i) => (
              <Cell key={i} state={s} today={i === 6} />
            ))}
          </div>
        </Fragment>
      </Scene>

      <Scene title={d.pact.title} text={d.pact.text} locale={locale}>
        <Fragment note={d.pact.note}>
          <div className="flex items-center justify-between gap-3">
            <span className="flex -space-x-2">
              {[d.pact.partner, d.pact.you].map((name, i) => (
                <span
                  key={name}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-card",
                    i === 0 ? "bg-freeze/15 text-freeze" : "bg-muted text-foreground"
                  )}
                >
                  {i === 0 ? initials(name) : name}
                </span>
              ))}
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold tabular-nums">
              <FlameIcon className="size-4 text-streak" /> {d.pact.streak}
            </span>
          </div>
          {[d.pact.partner, d.pact.you].map((name, row) => (
            <div key={name} className="flex items-center gap-2 sm:gap-3">
              <span className="w-9 shrink-0 truncate text-xs text-muted-foreground sm:w-12">{name}</span>
              <span className="flex gap-1 sm:gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <Cell key={i} state={i < 6 || row === 0 ? "done" : "empty"} today={i === 6} />
                ))}
              </span>
            </div>
          ))}
        </Fragment>
      </Scene>
    </div>
  )
}
