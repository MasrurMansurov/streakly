"use client"

import { useState } from "react"

type Point = { date: string; label: string; done: number }

const H = 160 // plot height in px
const X_LABELS = 5 // about this many labels on the x axis

/**
 * A small bar chart in plain SVG + CSS (replaces recharts: ~115 KB gzipped
 * for one simple chart). Bars scale to `max`; three grid lines; sparse x
 * labels; the hovered bar shows its value. For screen readers the whole
 * chart is one image with every value in its label (no 30 tab stops).
 */
export function ActivityChart({ data, max, color = "#10b981", label = "Completed" }: { data: Point[]; max: number; color?: string; label?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const top = Math.max(1, max)
  const ticks = [top, Math.round(top / 2), 0].filter((v, i, a) => a.indexOf(v) === i)
  const step = Math.max(1, Math.ceil(data.length / X_LABELS))

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2 text-[11px] text-muted-foreground">
      {/* y axis */}
      <div className="relative w-6 text-right" style={{ height: H }}>
        {ticks.map((v) => (
          <span key={v} className="absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: H - (v / top) * H }}>
            {v}
          </span>
        ))}
      </div>

      {/* plot */}
      <div
        className="relative"
        style={{ height: H }}
        role="img"
        aria-label={`${label}: ${data.map((p) => `${p.label} ${p.done}`).join(", ")}`}
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((v) => (
          <div key={v} className="absolute inset-x-0 border-t border-border" style={{ top: H - (v / top) * H }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-[3px]">
          {data.map((p, i) => (
            <div key={p.date} className="relative flex h-full min-w-0 flex-1 items-end" onMouseEnter={() => setActive(i)}>
              <span
                className="w-full rounded-t-[3px] transition-[height,opacity] duration-300"
                style={{ height: `${(p.done / top) * 100}%`, background: color, opacity: active === null || active === i ? 1 : 0.55 }}
              />
              {active === i && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 whitespace-nowrap text-popover-foreground shadow-sm">
                  {p.label} · <span className="font-medium tabular-nums">{p.done}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* x axis */}
      <div />
      <div className="relative mt-1.5 h-4" aria-hidden>
        {data.map((p, i) =>
          // every `step`-th label, and the last one unless it would crowd the previous
          i % step === 0 || (i === data.length - 1 && (data.length - 1) % step >= step / 2) ? (
            // centered under its bar, free to be wider than the bar
            <span
              key={p.date}
              className="absolute whitespace-nowrap"
              // the edge labels hug the edges so they never spill out of the card
              style={
                i === 0
                  ? { left: 0 }
                  : i === data.length - 1
                    ? { right: 0 }
                    : { left: `${((i + 0.5) / data.length) * 100}%`, transform: "translateX(-50%)" }
              }
            >
              {p.label}
            </span>
          ) : null
        )}
      </div>
    </div>
  )
}
