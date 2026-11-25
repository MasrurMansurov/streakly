"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { clientToday } from "@/lib/day-start-client"

export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

/**
 * Pages render the user's "today" on the server. A tab or installed PWA can
 * stay open across the start of a new day (midnight, or the person's own
 * day-start hour), so re-render when the person's "today" changes:
 * on return to the app, on focus, and with a light once-a-minute check.
 */
export function DayRollover() {
  const router = useRouter()

  useEffect(() => {
    let day = clientToday()
    const check = () => {
      const now = clientToday()
      if (now === day) return
      day = now
      router.refresh()
    }
    const onVisible = () => document.visibilityState === "visible" && check()
    const timer = window.setInterval(check, 60_000)
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", check)
    }
  }, [router])

  return null
}
