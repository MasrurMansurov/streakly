"use client"

import { useEffect } from "react"

/** Registers the service worker (offline support + notifications) in production. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
  }, [])
  return null
}

/** Forget cached pages (call on sign-out / account deletion). */
export async function clearOfflinePages() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration("/")
    reg?.active?.postMessage("clear-pages")
    if ("caches" in window) for (const key of await caches.keys()) await caches.delete(key)
  } catch {
    // best effort
  }
}
