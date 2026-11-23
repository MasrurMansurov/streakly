"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { TIMEZONE_COOKIE } from "@/lib/dates"

/**
 * Stores the browser's IANA timezone in a cookie so the server can compute
 * the user's local "today". Refreshes once if the value changed.
 */
export function TimezoneSync() {
  const router = useRouter()

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TIMEZONE_COOKIE}=`))
      ?.split("=")[1]
    if (tz && decodeURIComponent(current ?? "") !== tz) {
      document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`
      router.refresh()
    }
  }, [router])

  return null
}
