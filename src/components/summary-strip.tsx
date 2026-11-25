import { cn } from "@/lib/utils"

/** One quiet row of key numbers (dashboard, habit page): label above, value below, thin dividers. */
export function SummaryStrip({ items, className }: { items: { label: string; value: string }[]; className?: string }) {
  return (
    <dl
      className={cn("grid divide-x rounded-xl border bg-card", className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((i) => (
        <div key={i.label} className="min-w-0 px-3 py-2.5 sm:px-4 sm:py-3">
          <dt className="truncate text-xs text-muted-foreground">{i.label}</dt>
          <dd className="text-lg font-semibold sm:text-xl">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}
