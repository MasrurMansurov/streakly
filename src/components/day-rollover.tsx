"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { todayIn } from "@/lib/dates"

export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

/**
 * Pages render the user's "today" on the server. A tab or installed PWA can
 * stay open across midnight, so re-render when the local date changes:
 * on return to the app, on focus, and with a light once-a-minute check.
 */
export function DayRollover() {
  const router = useRouter()

  useEffect(() => {
    let day = todayIn(browserTimezone())
    const check = () => {
      const now = todayIn(browserTimezone())
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
