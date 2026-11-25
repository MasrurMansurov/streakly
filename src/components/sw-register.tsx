"use client"

import { useEffect } from "react"

import { isChunkError } from "@/lib/chunk-error"
import { unsubscribeThisDevice } from "@/lib/push-device"

const RELOADED_KEY = "streakly:chunk-reload"

/**
 * Registers the service worker (offline support + notifications) in production,
 * checks for a new version whenever the app comes back to the foreground, and
 * recovers from a deploy that removed the chunks an open tab still needs
 * (no Skew Protection on the Hobby plan): one reload per session.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    const onChunkError = (reason: unknown) => {
      if (!isChunkError(reason)) return
      try {
        if (sessionStorage.getItem(RELOADED_KEY)) return
        sessionStorage.setItem(RELOADED_KEY, "1")
      } catch {
        return
      }
      window.location.reload()
    }
    const onError = (e: ErrorEvent) => onChunkError(e.error ?? e.message)
    const onRejection = (e: PromiseRejectionEvent) => onChunkError(e.reason)
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)

    let onVisible: (() => void) | undefined
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
      onVisible = () => {
        if (document.visibilityState !== "visible") return
        navigator.serviceWorker
          .getRegistration("/")
          .then((reg) => reg?.update())
          .catch(() => {})
      }
      document.addEventListener("visibilitychange", onVisible)
    }

    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
      if (onVisible) document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])
  return null
}

/**
 * Forget this device's signed-in state (call on sign-out / account deletion):
 * cached pages, and the push subscription — so the next person using this
 * browser doesn't get the previous user's reminders.
 */
export async function clearOfflinePages() {
  await unsubscribeThisDevice()
  try {
    const reg = await navigator.serviceWorker?.getRegistration("/")
    reg?.active?.postMessage("clear-pages")
    if ("caches" in window) for (const key of await caches.keys()) await caches.delete(key)
  } catch {
    // best effort
  }
}
