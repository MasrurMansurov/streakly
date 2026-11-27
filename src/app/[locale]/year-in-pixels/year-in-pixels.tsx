"use client";

import { EraserIcon, PrinterIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { intlLocale } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Five distinct colors, best → worst (readable in print too). */
const COLORS = ["#10b981", "#84cc16", "#facc15", "#fb923c", "#ef4444"] as const;

const store = {
  read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  write(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode / storage full: the page still works, it just won't remember */
    }
  },
};

const daysIn = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/**
 * Year in pixels: 12 months × 31 days, one color per day. Kept in this
 * browser (localStorage, per year) — a per-visitor convenience, no account.
 */
export function YearInPixels({ initialYear }: { initialYear: number }) {
  const { t, locale } = useI18n();
  const [year, setYear] = useState(initialYear);
  const [brush, setBrush] = useState(0);
  const [cells, setCells] = useState<Record<string, number>>({});
  const [labels, setLabels] = useState<string[]>([...t.pixels.labels]);

  // load after mount (the server render has no access to this browser's storage)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCells(store.read(`streakly:pixels:${year}`, {}));
  }, [year]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabels(
      store.read(`streakly:pixels:labels:${locale}`, [...t.pixels.labels]),
    );
  }, [locale, t.pixels.labels]);

  const monthFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale[locale], {
        month: "narrow",
        timeZone: "UTC",
      }),
    [locale],
  );
  const longFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale[locale], {
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );
  const months = Array.from({ length: 12 }, (_, m) =>
    monthFmt.format(new Date(Date.UTC(year, m, 1))),
  );
  const filled = Object.keys(cells).length;

  const paint = (key: string) => {
    const next = { ...cells };
    if (next[key] === brush) delete next[key];
    else next[key] = brush;
    setCells(next);
    store.write(`streakly:pixels:${year}`, next);
  };
  const rename = (i: number, value: string) => {
    const next = labels.map((l, j) => (j === i ? value : l));
    setLabels(next);
    store.write(`streakly:pixels:labels:${locale}`, next);
  };
  const clear = () => {
    if (!window.confirm(t.pixels.clearConfirm)) return;
    setCells({});
    store.write(`streakly:pixels:${year}`, {});
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <div
        role="region"
        aria-label={t.pixels.sheetTitle(year)}
        className="rounded-xl border bg-white p-4 text-zinc-900 print:border-0 print:p-0"
      >
        {/* capped width: the whole year fits a desktop screen. On paper (the site-wide landscape
            layout) only the grid shrinks, so 31 rows + one-line title and legend fit one page */}
        <div
          data-print-sheet
          className="mx-auto max-w-[24rem] print:max-w-[30rem]"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {t.pixels.sheetTitle(year)}
            </h2>
            <span className="text-xs text-zinc-500 print:hidden">
              {t.pixels.filled(filled)}
            </span>
            {/* on paper the credit sits up here, so the sheet stays on one page */}
            <span className="hidden text-[10px] text-zinc-400 print:inline">
              streakly · year in pixels
            </span>
          </div>
          {/* on paper: the legend goes to the right of the grid (landscape has room; below it would spill onto page 2) */}
          <div className="print:flex print:items-start print:gap-8">
            <table className="w-full table-fixed border-separate border-spacing-[3px] text-[10px] print:w-[17rem]">
              <thead>
                <tr>
                  <th scope="col" className="w-5" />
                  {months.map((m, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="font-medium text-zinc-500"
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 31 }, (_, d) => (
                  <tr key={d}>
                    <th
                      scope="row"
                      className="pr-1 text-right font-normal text-zinc-400 tabular-nums"
                    >
                      {d + 1}
                    </th>
                    {months.map((_, m) => {
                      if (d + 1 > daysIn(year, m)) return <td key={m} />;
                      const key = iso(year, m, d + 1);
                      const value = cells[key];
                      const date = longFmt.format(
                        new Date(Date.UTC(year, m, d + 1)),
                      );
                      return (
                        <td key={m} className="p-0">
                          <button
                            type="button"
                            onClick={() => paint(key)}
                            aria-label={
                              value === undefined
                                ? date
                                : `${date}: ${labels[value]}`
                            }
                            aria-pressed={value !== undefined}
                            // min-w-0 / min-h-0: override the 44px touch minimum — 372 cells must fit a phone
                            className="block aspect-square min-h-0 w-full min-w-0 rounded-[3px] border border-zinc-200 transition-transform active:scale-90"
                            style={
                              value === undefined
                                ? undefined
                                : {
                                    background: COLORS[value],
                                    borderColor: COLORS[value],
                                  }
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-600 print:mt-6 print:flex-col print:gap-2">
              {labels.map((label, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span
                    className="size-3 rounded-[3px]"
                    style={{ background: COLORS[i] }}
                    aria-hidden
                  />
                  {label}
                </li>
              ))}
              <li className="ml-auto text-zinc-400 print:hidden">
                streakly · year in pixels
              </li>
            </ul>
          </div>
        </div>
      </div>

      <aside className="grid gap-4 rounded-xl border bg-card p-4 print:hidden">
        <div className="grid gap-2">
          <label htmlFor="px-year" className="text-sm font-medium">
            {t.pixels.year}
          </label>
          <select
            id="px-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {[initialYear - 1, initialYear, initialYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">{t.pixels.brush}</legend>
          {labels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBrush(i)}
                aria-pressed={brush === i}
                aria-label={label}
                className={cn(
                  "size-8 shrink-0 rounded-lg border-2 transition",
                  brush === i ? "border-foreground" : "border-transparent",
                )}
                style={{ background: COLORS[i] }}
              />
              <Input
                aria-label={t.pixels.labelEdit(i + 1)}
                value={label}
                maxLength={24}
                onChange={(e) => rename(i, e.target.value)}
                className="h-8"
              />
            </div>
          ))}
        </fieldset>
        <p className="text-xs text-muted-foreground">{t.pixels.hint}</p>
        <div className="grid gap-2">
          <Button onClick={() => window.print()}>
            <PrinterIcon aria-hidden /> {t.pixels.print}
          </Button>
          <Button variant="ghost" onClick={clear} disabled={filled === 0}>
            <EraserIcon aria-hidden /> {t.pixels.clear}
          </Button>
        </div>
      </aside>
    </div>
  );
}
