"use client"

import { useEffect } from "react"

import type { DayStart } from "@/lib/dates"
import { setClientDayStart } from "@/lib/day-start-client"

/** Hands the server's day-start setting to the browser's "today" (see clientToday). */
export function DayStartSync({ value }: { value: DayStart }) {
  useEffect(() => setClientDayStart(value), [value])
  return null
}
