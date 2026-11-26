"use client"

import { PrinterIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { intlLocale } from "@/i18n"
import { useI18n } from "@/i18n/client"

const MAX_HABITS = 12
/** blank rows to fill in by hand when only a few habits are typed */
const MIN_ROWS = 8

/** "ноябрь 2026 г." → "Ноябрь 2026 г." (CSS capitalize would also make it "Г.") */
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "2026-11" for this month and the next 11 */
function monthOptions(from: Date) {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(from.getFullYear(), from.getMonth() + i, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
  })
}

/**
 * A printable monthly habit tracker: habits as rows, days as columns,
 * weekends shaded. window.print() + print CSS — "Save as PDF" in the dialog.
 */
export function PrintableTracker({ initialMonth }: { initialMonth: string }) {
  const { t, locale } = useI18n()
  const months = useMemo(() => monthOptions(new Date(`${initialMonth}-01T00:00:00Z`)), [initialMonth])
  const [month, setMonth] = useState(initialMonth)
  const [title, setTitle] = useState(t.printable.defaultSheetTitle)
  const [habitText, setHabitText] = useState(t.printable.defaultHabits)

  const habits = habitText
    .split("\n")
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, MAX_HABITS)
  const [y, m] = month.split("-").map(Number)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  // Russian one-letter weekdays are ambiguous (В = вторник or воскресенье) → two letters there
  const fmt = new Intl.DateTimeFormat(intlLocale[locale], { timeZone: "UTC", weekday: locale === "ru" ? "short" : "narrow" })
  const monthName = new Intl.DateTimeFormat(intlLocale[locale], { timeZone: "UTC", month: "long", year: "numeric" })
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1, i + 1))
    const dow = date.getUTCDay()
    return { n: i + 1, letter: fmt.format(date), weekend: dow === 0 || dow === 6 }
  })

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 print:hidden">
        <div className="grid gap-2">
          <Label htmlFor="pt-month">{t.printable.month}</Label>
          <select
            id="pt-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {months.map((mo) => (
              <option key={mo} value={mo}>
                {upperFirst(monthName.format(new Date(`${mo}-01T00:00:00Z`)))}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pt-title">{t.printable.sheetTitle}</Label>
          <Input id="pt-title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="pt-habits">{t.printable.habits}</Label>
          <Textarea id="pt-habits" rows={5} value={habitText} onChange={(e) => setHabitText(e.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Button className="w-fit" onClick={() => window.print()}>
            <PrinterIcon aria-hidden /> {t.printable.print}
          </Button>
          <p className="text-xs text-muted-foreground">{t.printable.printHint}</p>
        </div>
      </div>

      {/* the sheet: on screen a preview (scrolls sideways on a phone), on paper the only thing printed */}
      <div role="region" aria-label={title} tabIndex={0} className="overflow-x-auto rounded-xl border bg-white p-4 text-zinc-900 print:overflow-visible print:border-0 print:p-0">
        <div data-print-sheet className="min-w-[46rem]">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold">{title || t.printable.defaultSheetTitle}</h2>
            <span className="text-sm text-zinc-500">{upperFirst(monthName.format(new Date(`${month}-01T00:00:00Z`)))}</span>
          </div>
          <table className="w-full table-fixed border-collapse text-[11px]">
            <colgroup>
              <col className="w-40" />
              {days.map((d) => (
                <col key={d.n} />
              ))}
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="border border-zinc-300 px-2 py-1 text-left font-medium">
                  {t.printable.habitCol}
                </th>
                {days.map((d) => (
                  <th key={d.n} scope="col" className={`border border-zinc-300 py-0.5 text-center font-normal ${d.weekend ? "bg-zinc-100" : ""}`}>
                    <div className="text-[9px] text-zinc-500">{d.letter}</div>
                    <div className="font-medium">{d.n}</div>
                  </th>
                ))}
                <th scope="col" className="border border-zinc-300 text-center font-medium">
                  {t.printable.totalCol}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...habits, ...Array<string>(Math.max(0, MIN_ROWS - habits.length)).fill("")].map((h, i) => (
                <tr key={`${h}-${i}`}>
                  <th scope="row" className="h-8 truncate border border-zinc-300 px-2 text-left font-medium print:h-11">
                    {h}
                  </th>
                  {days.map((d) => (
                    <td key={d.n} className={`border border-zinc-300 ${d.weekend ? "bg-zinc-100" : ""}`} />
                  ))}
                  <td className="border border-zinc-300" />
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex justify-between text-[10px] text-zinc-400">
            <span>{t.printable.weekendNote}</span>
            <span>streakly · free habit tracker</span>
          </div>
        </div>
      </div>
    </div>
  )
}
