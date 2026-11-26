import { cn } from "@/lib/utils"

/** One quiet row of key numbers (dashboard, habit page): label above, value below, thin dividers. */
export function SummaryStrip({ items, className }: { items: { label: string; value: string }[]; className?: string }) {
  return (
    <dl
      // 4+ numbers don't fit one row on a phone (labels would read "Best st…") → 2×2 there
      className={cn("grid divide-x rounded-xl border bg-card", items.length >= 4 && "max-sm:grid-cols-2! max-sm:divide-x-0", className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((i) => (
        // a long label wraps instead of "Best st…"; the value sits at the bottom so values line up
        <div key={i.label} className="flex min-w-0 flex-col justify-between gap-0.5 px-3 py-2.5 sm:px-4 sm:py-3">
          <dt className="text-xs leading-snug text-muted-foreground [overflow-wrap:anywhere]">{i.label}</dt>
          <dd className="text-lg font-semibold sm:text-xl">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}
