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

/**
 * When the person's day starts ("my day ends at 3 a.m."): 0–6 hours after
 * midnight. A change takes effect from the next day (`since`): until then the
 * previous hour (`ph`) applies, so "today" never jumps back and a streak never
 * breaks because of the setting itself — the day of the change just gets a
 * little longer or shorter.
 */
export type DayStart = { h: number; ph?: number; since?: ISODate }

export const MAX_DAY_START_HOUR = 6

const validHour = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= MAX_DAY_START_HOUR

/** Reads the stored setting (user metadata); anything unexpected means midnight. */
export function parseDayStart(value: unknown): DayStart {
  if (!value || typeof value !== "object") return { h: 0 }
  const v = value as Record<string, unknown>
  if (!validHour(v.h)) return { h: 0 }
  const out: DayStart = { h: v.h }
  if (validHour(v.ph) && isISODate(v.since)) {
    out.ph = v.ph
    out.since = v.since
  }
  return out
}

/**
 * The local date whose day started at `hours` o'clock (wall clock, not elapsed
 * time — on a 23/25-hour DST day 03:30 is still "after 3"). Same as SQL
 * ((now() at time zone tz) - hours * interval '1 hour')::date.
 */
function shiftedDate(timeZone: string, hours: number, now: Date): ISODate {
  const date = todayIn(timeZone, now)
  if (hours === 0) return date
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now))
  return hour < hours ? addDays(date, -1) : date
}

/**
 * The person's "today": the calendar date in their time zone, with the day
 * starting at their day-start hour. The same rule runs in SQL
 * (public.logical_date) for reminders.
 */
export function logicalToday(timeZone: string, dayStart: DayStart = { h: 0 }, now: Date = new Date()): ISODate {
  const next = shiftedDate(timeZone, dayStart.h, now)
  if (dayStart.since === undefined || dayStart.ph === undefined) return next
  const before = shiftedDate(timeZone, dayStart.ph, now)
  if (before < dayStart.since) return before
  return next > dayStart.since ? next : dayStart.since
}

/** The setting after changing the hour to `h` while `today` is the person's current day. */
export function changeDayStart(current: DayStart, h: number, today: ISODate): DayStart {
  const effectiveNow = current.since !== undefined && today < current.since ? (current.ph ?? current.h) : current.h
  if (h === effectiveNow) return { h }
  return { h, ph: effectiveNow, since: addDays(today, 1) }
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
