"use client"

import { useEffect } from "react"

import { playChime, reminderSoundOn } from "@/lib/reminder-sound"

/** Plays the chime when the service worker says a reminder just arrived. */
export function ReminderSound() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "reminder-sound" && reminderSoundOn()) void playChime()
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [])
  return null
}
