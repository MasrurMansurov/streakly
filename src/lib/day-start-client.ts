"use client"

import { logicalToday, type DayStart } from "./dates"

/**
 * The signed-in person's day-start setting in the browser, handed over by the
 * server (<DayStartSync />), so "today" in the browser follows the same rule
 * as on the server.
 */
let current: DayStart = { h: 0 }

export function setClientDayStart(dayStart: DayStart) {
  current = dayStart
}

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

/** The person's "today" right now, in this browser. */
export const clientToday = () => logicalToday(browserTimezone(), current)
