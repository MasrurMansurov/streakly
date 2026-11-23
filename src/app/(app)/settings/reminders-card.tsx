"use client"

import { BellIcon, BellOffIcon, SendIcon, SmartphoneIcon } from "lucide-react"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  removePushSubscription,
  savePushSubscription,
  saveReminderSettings,
  sendTestNotification,
} from "@/app/actions/reminders"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { ReminderSettings } from "@/lib/data"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

// 06:00 … 23:30, every half hour
const TIMES = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
})

type Support = "checking" | "ok" | "ios-install" | "unsupported" | "denied"

function base64UrlToUint8Array(base64Url: string) {
  const padded = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

async function getRegistration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" })
}

export function RemindersCard({ initial }: { initial: ReminderSettings }) {
  const [enabled, setEnabled] = useState(initial.enabled)
  const [remindAt, setRemindAt] = useState(initial.remindAt)
  const [support, setSupport] = useState<Support>("checking")
  const [deviceSubscribed, setDeviceSubscribed] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const check = async () => {
      const hasPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const standalone = window.matchMedia("(display-mode: standalone)").matches
      if (!hasPush) return setSupport(isIOS && !standalone ? "ios-install" : "unsupported")
      if (Notification.permission === "denied") return setSupport("denied")
      setSupport("ok")
      const reg = await navigator.serviceWorker.getRegistration("/")
      setDeviceSubscribed(Boolean(await reg?.pushManager.getSubscription()))
    }
    void check()
  }, [])

  /** Ask for permission and register this device for push. */
  const subscribeDevice = async () => {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      if (permission === "denied") setSupport("denied")
      throw new Error("Notifications permission was not granted")
    }
    const reg = await getRegistration()
    await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
      }))
    const json = sub.toJSON()
    const res = await savePushSubscription({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      userAgent: navigator.userAgent.slice(0, 300),
    })
    if (!res.ok) throw new Error(res.error)
    setDeviceSubscribed(true)
  }

  const save = (next: { enabled: boolean; remindAt: string }) =>
    saveReminderSettings({ ...next, timezone: browserTimezone() })

  const toggle = (on: boolean) =>
    startTransition(async () => {
      try {
        if (on) await subscribeDevice()
        else {
          const reg = await navigator.serviceWorker.getRegistration("/")
          const sub = await reg?.pushManager.getSubscription()
          if (sub) {
            await removePushSubscription(sub.endpoint)
            await sub.unsubscribe()
          }
          setDeviceSubscribed(false)
        }
        const res = await save({ enabled: on, remindAt })
        if (!res.ok) throw new Error(res.error)
        setEnabled(on)
        toast.success(on ? `Reminders on — every day at ${remindAt}` : "Reminders off")
      } catch (e) {
        toast.error((e as Error).message)
      }
    })

  const changeTime = (value: string) => {
    setRemindAt(value)
    if (!enabled) return
    startTransition(async () => {
      const res = await save({ enabled, remindAt: value })
      if (res.ok) toast.success(`Reminder time set to ${value}`)
      else toast.error(res.error)
    })
  }

  const sendTest = () =>
    startTransition(async () => {
      const res = await sendTestNotification()
      if (res.ok) toast.success(res.message ?? "Sent")
      else toast.error(res.error)
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellIcon className="size-4" /> Reminders
        </CardTitle>
        <CardDescription>
          A daily notification if you still have habits left — skipped on days you&apos;re already done.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {support === "ios-install" && (
          <Notice icon={<SmartphoneIcon />}>
            On iPhone and iPad, notifications work once Streakly is on your Home Screen: tap <b>Share</b> →{" "}
            <b>Add to Home Screen</b>, open Streakly from there, and come back to this page.
          </Notice>
        )}
        {support === "unsupported" && (
          <Notice icon={<BellOffIcon />}>This browser doesn&apos;t support notifications. Try Chrome, Edge, Firefox or Safari.</Notice>
        )}
        {support === "denied" && (
          <Notice icon={<BellOffIcon />}>
            Notifications are blocked for this site. Allow them in your browser&apos;s site settings (the icon next to the
            address bar), then reload the page.
          </Notice>
        )}

        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div className="grid gap-1">
            <Label htmlFor="reminders-enabled">Daily reminder</Label>
            <p className="text-xs text-muted-foreground">
              {!enabled ? "Off" : deviceSubscribed ? "On · this device gets reminders" : "On · not on this device"}
            </p>
          </div>
          <Switch
            id="reminders-enabled"
            checked={enabled}
            disabled={pending || support !== "ok" || !VAPID_PUBLIC_KEY}
            onCheckedChange={toggle}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="remind-at">Remind me at</Label>
          <select
            id="remind-at"
            value={remindAt}
            disabled={pending}
            onChange={(e) => changeTime(e.target.value)}
            className="h-8 rounded-lg border bg-background px-2 text-sm"
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">your local time</span>
        </div>

        {enabled && support === "ok" && (
          <div className="flex flex-wrap gap-2">
            {!deviceSubscribed && (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => toggle(true)}>
                <BellIcon /> Also remind me on this device
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={pending} onClick={sendTest}>
              <SendIcon /> Send a test notification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg bg-muted p-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
      {icon}
      <p>{children}</p>
    </div>
  )
}
