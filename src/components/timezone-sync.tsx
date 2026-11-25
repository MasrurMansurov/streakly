"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { syncTimezone } from "@/app/actions/reminders"
import { browserTimezone } from "@/components/day-rollover"
import { TIMEZONE_COOKIE } from "@/lib/dates"

const SYNCED_KEY = "streakly:tz-synced"

/**
 * Keeps one timezone for every surface:
 * - a cookie, so the server computes the user's local "today" for pages and actions;
 * - reminder_settings.timezone, so reminders and pact nudges use the same day
 *   (after travel the stored zone moves forward; history is not recalculated).
 * Refreshes once if the cookie changed.
 */
export function TimezoneSync() {
  const router = useRouter()

  useEffect(() => {
    const tz = browserTimezone()
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TIMEZONE_COOKIE}=`))
      ?.split("=")[1]
    if (tz && decodeURIComponent(current ?? "") !== tz) {
      document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`
      router.refresh()
    }

    // once per app session (and whenever the zone changes)
    let synced: string | null = null
    try {
      synced = sessionStorage.getItem(SYNCED_KEY)
    } catch {}
    if (tz && synced !== tz) {
      syncTimezone(tz)
        .then((res) => {
          if (!res.ok) return
          try {
            sessionStorage.setItem(SYNCED_KEY, tz)
          } catch {}
        })
        .catch(() => {})
    }
  }, [router])

  return null
}
