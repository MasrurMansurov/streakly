/**
 * Calendar dates are handled as "YYYY-MM-DD" strings (same as Postgres `date`).
 * Arithmetic is done in UTC so the result never depends on the server's timezone.
 */
export type ISODate = string

export const DEFAULT_TIMEZONE = "UTC"
export const TIMEZONE_COOKIE = "tz"

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value)
}

export function isValidTimezone(tz: string | undefined): tz is string {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** Today's calendar date in the given IANA timezone. */
export function todayIn(timeZone: string, now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** How many past days a check-in can still be set or cleared (the week strip on a habit card). */
export const CHECKIN_WINDOW_DAYS = 7

/** A check-in date is allowed from `today − CHECKIN_WINDOW_DAYS` up to `today` (the user's local day). */
export function isCheckInDateAllowed(date: ISODate, today: ISODate): boolean {
  return isISODate(date) && date <= today && date >= addDays(today, -CHECKIN_WINDOW_DAYS)
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Whole days from `a` to `b` (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/** Inclusive list of dates, oldest first. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

/** 0 = Monday … 6 = Sunday */
export function weekdayMon0(date: ISODate): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
}

export function formatDate(
  date: ISODate,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`)
  )
}
