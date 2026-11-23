import { addDays, formatDate, weekdayMon0, type ISODate } from "@/lib/dates"
import { ScrollToEnd } from "@/components/scroll-to-end"
import { cn } from "@/lib/utils"

const LEVELS = [
  "bg-muted",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-400 dark:bg-emerald-700",
  "bg-emerald-500 dark:bg-emerald-500",
  "bg-emerald-700 dark:bg-emerald-300",
]

type Props = {
  /** completions per day */
  counts: ReadonlyMap<ISODate, number>
  /** number of habits = "100%" for a day */
  max: number
  today: ISODate
  weeks?: number
  className?: string
  /** single-habit mode: every completed day uses this class instead of the intensity scale */
  doneClassName?: string
}

/** GitHub-style contribution grid: one column per week, Monday on top. */
export function Heatmap({ counts, max, today, weeks = 26, className, doneClassName }: Props) {
  const start = addDays(today, -weekdayMon0(today) - (weeks - 1) * 7)

  const columns: { date: ISODate; future: boolean }[][] = []
  for (let w = 0; w < weeks; w++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d)
      col.push({ date, future: date > today })
    }
    columns.push(col)
  }

  const level = (n: number) => {
    if (n <= 0 || max <= 0) return 0
    return Math.min(4, Math.max(1, Math.ceil((n / max) * 4)))
  }

  // month labels on the first column of each month
  const monthLabels = columns.map((col, i) => {
    const first = col[0].date
    const prev = i > 0 ? columns[i - 1][0].date : null
    const month = first.slice(5, 7)
    // skip the very first column if the next month starts right after it (avoids "NovDec")
    if (!prev) return columns[2]?.[0].date.slice(5, 7) === month ? formatDate(first, { month: "short" }) : ""
    return month !== prev.slice(5, 7) ? formatDate(first, { month: "short" }) : ""
  })

  return (
    // on narrow screens start scrolled to the most recent weeks
    <ScrollToEnd className={cn("pb-1", className)}>
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-[3px] pl-7 text-[10px] text-muted-foreground">
          {monthLabels.map((label, i) => (
            <div key={i} className="w-3 overflow-visible whitespace-nowrap">
              {label}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          <div className="mr-1 flex w-6 flex-col gap-[3px] text-[10px] leading-3 text-muted-foreground">
            {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
              <div key={i} className="h-3">
                {d}
              </div>
            ))}
          </div>
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map(({ date, future }) => {
                const n = counts.get(date) ?? 0
                return (
                  <div
                    key={date}
                    title={future ? undefined : `${formatDate(date, { month: "short", day: "numeric", year: "numeric" })}: ${n} done`}
                    className={cn(
                      "size-3 rounded-[3px]",
                      future ? "bg-transparent" : doneClassName && n > 0 ? doneClassName : LEVELS[level(n)]
                    )}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className={cn("flex items-center justify-end gap-1 text-[10px] text-muted-foreground", doneClassName && "hidden")}>
          Less
          {LEVELS.map((c) => (
            <div key={c} className={cn("size-3 rounded-[3px]", c)} />
          ))}
          More
        </div>
      </div>
    </ScrollToEnd>
  )
}
