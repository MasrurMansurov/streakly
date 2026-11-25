"use client"

import { useEffect } from "react"

import { saveAttribution } from "@/app/actions/analytics"
import { ATTRIBUTION_COOKIE as COOKIE, attributionFrom } from "@/lib/attribution"

/** On the first visit, remember where the visitor came from (90 days, first touch only). */
export function AttributionCapture() {
  useEffect(() => {
    if (document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`))) return
    const a = attributionFrom({
      search: window.location.search,
      referrer: document.referrer,
      host: window.location.hostname,
      path: window.location.pathname,
    })
    if (!a) return
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(a))}; path=/; max-age=${90 * 86400}; samesite=lax`
  }, [])
  return null
}

/** Signed-in pages: hand the first-touch source to the account once (new users only). */
export function AttributionSave() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("streakly:attr-saved")) return
      sessionStorage.setItem("streakly:attr-saved", "1")
    } catch {}
    void saveAttribution().catch(() => {})
  }, [])
  return null
}
