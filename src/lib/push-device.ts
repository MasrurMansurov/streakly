"use client"

import { removePushSubscription, savePushSubscription } from "@/app/actions/reminders"

/**
 * This device's push subscription, shared by the settings card, the sync on
 * app open (<PushSync />) and sign-out.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
/** Set while the person wants reminders on this device (survives a revoked subscription). */
const WANTED_KEY = "streakly:push-wanted"
/** Endpoint already confirmed with the server in this app session. */
const SYNCED_KEY = "streakly:push-synced"

const storage = {
  get: (s: Storage, k: string) => {
    try {
      return s.getItem(k)
    } catch {
      return null
    }
  },
  set: (s: Storage, k: string, v: string | null) => {
    try {
      if (v === null) s.removeItem(k)
      else s.setItem(k, v)
    } catch {}
  },
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

export function base64UrlToUint8Array(base64Url: string) {
  const padded = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

export async function getRegistration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" })
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON()
  const res = await savePushSubscription({
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
    userAgent: navigator.userAgent.slice(0, 300),
  })
  if (res.ok) storage.set(sessionStorage, SYNCED_KEY, sub.endpoint)
  return res
}

/** Subscribe this browser (permission must already be granted) and store it for the signed-in user. */
export async function subscribeThisDevice() {
  const reg = await getRegistration()
  await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY) }))
  const res = await save(sub)
  if (res.ok) storage.set(localStorage, WANTED_KEY, "1")
  return res
}

/** Stop pushes to this browser: server row, browser subscription and the "wanted" flag. */
export async function unsubscribeThisDevice() {
  storage.set(localStorage, WANTED_KEY, null)
  storage.set(sessionStorage, SYNCED_KEY, null)
  if (!pushSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration("/")
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await removePushSubscription(sub.endpoint).catch(() => {})
    await sub.unsubscribe()
  } catch {
    // best effort
  }
}

/**
 * On app open: confirm this device's subscription with the server (fresh keys,
 * "seen" time, the signed-in owner). If the browser dropped the subscription
 * (iOS revokes them; endpoints rotate) but the person wants reminders here,
 * subscribe again — permission is already granted, so nothing is asked.
 */
export async function syncThisDevice() {
  if (!pushSupported() || Notification.permission !== "granted") return
  const reg = await navigator.serviceWorker.getRegistration("/")
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    if (storage.get(sessionStorage, SYNCED_KEY) !== sub.endpoint) await save(sub)
    return
  }
  if (storage.get(localStorage, WANTED_KEY) === "1" && VAPID_PUBLIC_KEY) await subscribeThisDevice()
}
