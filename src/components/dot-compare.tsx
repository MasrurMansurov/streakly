import { cn } from "@/lib/utils"

type Props = {
  /** 1–5 averages */
  withAvg: number
  withoutAvg: number
  nWith: number
  nWithout: number
  /** the habit's dot color class — habitColor(color).dot */
  dotClass: string
  labels: { with: string; without: string; days: (n: number) => string; format: (x: number) => string }
  /** early look: shown, but quieter */
  muted?: boolean
  className?: string
}

const at = (v: number) => `${((Math.min(5, Math.max(1, v)) - 1) / 4) * 100}%`

/**
 * Two dots on the full 1–5 scale — days with the habit (its color) and without
 * (muted ink) — with the averages and day counts underneath. Not bars: bars from
 * 0 hide the gap and bars from 3 inflate it. A lower "with" looks exactly like a
 * higher one: no red, no warning icons.
 */
export function DotCompare({ withAvg, withoutAvg, nWith, nWithout, dotClass, labels, muted, className }: Props) {
  return (
    <div className={cn("grid gap-2", muted && "opacity-60", className)}>
      <div aria-hidden className="flex items-center gap-2.5 text-[11px] text-muted-foreground tabular-nums">
        <span>1</span>
        <div className="relative h-4 flex-1">
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          {/* the gap between the two averages */}
          <span
            className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground/15"
            style={{ left: at(Math.min(withAvg, withoutAvg)), right: `calc(100% - ${at(Math.max(withAvg, withoutAvg))})` }}
          />
          <span
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-muted-foreground bg-card"
            style={{ left: at(withoutAvg) }}
          />
          <span className={cn("absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full", dotClass)} style={{ left: at(withAvg) }} />
        </div>
        <span>5</span>
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2 rounded-full", dotClass)} />
          <dt>{labels.with}</dt>
          <dd className="font-medium text-foreground tabular-nums">{labels.format(withAvg)}</dd>
          <dd className="tabular-nums">· {labels.days(nWith)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full border-[1.5px] border-muted-foreground" />
          <dt>{labels.without}</dt>
          <dd className="font-medium text-foreground tabular-nums">{labels.format(withoutAvg)}</dd>
          <dd className="tabular-nums">· {labels.days(nWithout)}</dd>
        </div>
      </dl>
    </div>
  )
}
