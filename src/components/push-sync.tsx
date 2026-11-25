"use client"

import { useEffect } from "react"

import { syncThisDevice } from "@/lib/push-device"

/** Signed-in pages: keep this device's push subscription confirmed with the server. */
export function PushSync() {
  useEffect(() => {
    const run = () => void syncThisDevice().catch(() => {})
    const onVisible = () => document.visibilityState === "visible" && run()
    run()
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])
  return null
}
