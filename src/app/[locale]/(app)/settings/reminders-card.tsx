"use client"

import {
  BellIcon,
  MoonIcon,
  SunIcon,
  SunriseIcon,
  SunsetIcon,
  type LucideIcon,
  BellOffIcon,
  CheckCircle2Icon,
  ClockIcon,
  SendIcon,
  SmartphoneIcon,
  PlayIcon,
  Volume2Icon,
} from "lucide-react"
import { useEffect, useState, useSyncExternalStore, useTransition, type ReactNode } from "react"
import { toast } from "sonner"

import {
  saveReminderSettings,
  sendTestNotification,
} from "@/app/actions/reminders"
import { IconTile, type IconTone } from "@/components/icon-tile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useI18n } from "@/i18n/client"
import type { ReminderSettings } from "@/lib/data"
import { cn } from "@/lib/utils"
import { browserTimezone } from "@/components/day-rollover"
import { playChime, reminderSoundOn, setReminderSound } from "@/lib/reminder-sound"
import { subscribeThisDevice, unsubscribeThisDevice } from "@/lib/push-device"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

const PRESETS: { time: string; key: string; icon: LucideIcon; tone: IconTone }[] = [
  { time: "08:00", key: "morning", icon: SunriseIcon, tone: "amber" },
  { time: "13:00", key: "afternoon", icon: SunIcon, tone: "orange" },
  { time: "20:00", key: "evening", icon: SunsetIcon, tone: "rose" },
  { time: "22:00", key: "night", icon: MoonIcon, tone: "violet" },
]

type Support = "checking" | "ok" | "ios-install" | "unsupported" | "denied"


/** Where to look when a delivered notification doesn't show up. */
function osOf(): "mac" | "windows" | "android" | "ios" | "other" {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return "ios"
  if (/Android/.test(ua)) return "android"
  if (/Mac OS X|Macintosh/.test(ua)) return "mac"
  if (/Windows/.test(ua)) return "windows"
  return "other"
}

/** "today" or "tomorrow", depending on whether the time already passed. */
function nextDay(time: string): "today" | "tomorrow" {
  const now = new Date()
  const [h, m] = time.split(":").map(Number)
  return now.getHours() * 60 + now.getMinutes() < h * 60 + m ? "today" : "tomorrow"
}

const noopSubscribe = () => () => {}

export function RemindersCard({ initial }: { initial: ReminderSettings }) {
  const { locale, t } = useI18n()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [remindAt, setRemindAt] = useState(initial.remindAt)
  const [support, setSupport] = useState<Support>("checking")
  const [deviceSubscribed, setDeviceSubscribed] = useState(false)
  const [timezone, setTimezone] = useState(initial.timezone)
  const [customTime, setCustomTime] = useState(initial.remindAt)
  const [soundOn, setSoundOn] = useState(true)
  const [pending, startTransition] = useTransition()
  // "today"/"tomorrow" depends on the browser clock: skip it during SSR
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const day = isClient ? nextDay(remindAt) : null

  useEffect(() => {
    const check = async () => {
      setTimezone(browserTimezone())
      setSoundOn(reminderSoundOn())
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

  /** Ask for permission and register this browser for push. */
  const subscribeDevice = async () => {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      if (permission === "denied") setSupport("denied")
      throw new Error(t.reminders.notAllowed)
    }
    const res = await subscribeThisDevice()
    if (!res.ok) throw new Error(res.error)
    setDeviceSubscribed(true)
  }

  const save = (next: { enabled: boolean; remindAt: string }) =>
    saveReminderSettings({ ...next, timezone: browserTimezone(), locale })

  const toggle = (on: boolean) =>
    startTransition(async () => {
      try {
        if (on) await subscribeDevice()
        else {
          await unsubscribeThisDevice()
          setDeviceSubscribed(false)
        }
        const res = await save({ enabled: on, remindAt })
        if (!res.ok) throw new Error(res.error)
        setEnabled(on)
        toast.success(on ? t.reminders.on(remindAt) : t.reminders.offToast)
      } catch (e) {
        toast.error((e as Error).message)
      }
    })

  const subscribeOnThisDevice = () =>
    startTransition(async () => {
      try {
        await subscribeDevice()
        toast.success(t.reminders.alsoOn)
      } catch (e) {
        toast.error((e as Error).message)
      }
    })

  const changeTime = (value: string) => {
    // any minute works: the scheduler runs every minute. Drop seconds if the browser adds them.
    const time = value.slice(0, 5)
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return
    if (time === remindAt) return setCustomTime(time)
    const previous = remindAt
    setRemindAt(time)
    setCustomTime(time)
    startTransition(async () => {
      const res = await save({ enabled, remindAt: time })
      if (res.ok) toast.success(enabled ? t.reminders.moved(time) : t.reminders.timeSaved(time))
      else {
        setRemindAt(previous)
        setCustomTime(previous)
        toast.error(res.error)
      }
    })
  }

  const sendTest = () =>
    startTransition(async () => {
      const res = await sendTestNotification()
      if (!res.ok) return void toast.error(res.error)
      // delivered to the push service — if nothing shows up, the OS is hiding it
      toast.success(res.message ?? t.reminders.sent(1), { description: t.reminders.notShown[osOf()], duration: 15_000 })
    })

  const blocked = support !== "ok" && support !== "checking"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <CardTitle className="flex items-center gap-2">
              <IconTile icon={BellIcon} tone="amber" size="sm" />
              {t.reminders.title}
            </CardTitle>
            <CardDescription>
              {t.reminders.description}
            </CardDescription>
          </div>
          <Switch
            aria-label={t.reminders.toggle}
            checked={enabled}
            disabled={pending || support !== "ok" || !VAPID_PUBLIC_KEY}
            onCheckedChange={toggle}
          />
        </div>
      </CardHeader>

      <CardContent className="grid gap-5">
        {support === "ios-install" && (
          <Notice icon={<SmartphoneIcon />}>
            {t.reminders.iosInstall}
          </Notice>
        )}
        {support === "unsupported" && (
          <Notice icon={<BellOffIcon />}>{t.reminders.unsupported}</Notice>
        )}
        {support === "denied" && (
          <Notice icon={<BellOffIcon />}>
            {t.reminders.denied}
          </Notice>
        )}

        <fieldset className="grid gap-3" disabled={pending}>
          <legend className="mb-3 text-sm font-medium">{t.reminders.when}</legend>
          <div role="radiogroup" aria-label={t.reminders.timeGroup} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map(({ time, key, icon, tone }) => {
              const label = t.reminders.presets[key as keyof typeof t.reminders.presets]
              const selected = remindAt === time
              return (
                <button
                  key={time}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => changeTime(time)}
                  className={cn(
                    "group flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition outline-none",
                    "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
                    selected && "border-primary bg-primary/5 ring-1 ring-primary"
                  )}
                >
                  <IconTile icon={icon} tone={selected ? tone : "muted"} size="sm" className="transition-colors" />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{time}</span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="remind-at" className="font-normal text-muted-foreground">
              <ClockIcon className="size-4" /> {t.reminders.custom}
            </Label>
            <Input
              id="remind-at"
              type="time"
              step={60}
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              onBlur={() => customTime && changeTime(customTime)}
              onKeyDown={(e) => e.key === "Enter" && customTime && changeTime(customTime)}
              className={cn(
                "w-32 tabular-nums",
                !PRESETS.some((p) => p.time === remindAt) && "border-primary ring-1 ring-primary"
              )}
            />
          </div>
        </fieldset>

        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {enabled ? (
            <>
              {t.reminders.nextLabel}{" "}
              <span className="font-medium text-foreground">
                {day ? t.reminders.next(day, remindAt) : remindAt}
              </span>{" "}
              · {timezone}
            </>
          ) : (
            <>{t.reminders.off(remindAt, timezone)}</>
          )}
        </p>

        {enabled && !blocked && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            {deviceSubscribed ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2Icon className="size-4" /> {t.reminders.thisBrowser}
              </span>
            ) : (
              <Button variant="outline" size="sm" disabled={pending} onClick={subscribeOnThisDevice}>
                <BellIcon /> {t.reminders.alsoThisBrowser}
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={pending} onClick={sendTest}>
              <SendIcon /> {t.reminders.sendTest}
            </Button>
          </div>
        )}

        {enabled && !blocked && (
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <Label htmlFor="reminder-sound" className="inline-flex items-center gap-1.5">
                <Volume2Icon className="size-4" /> {t.reminders.sound}
              </Label>
              <p className="text-xs text-muted-foreground">{t.reminders.soundHint}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!(await playChime())) toast.error(t.reminders.soundBlocked)
                }}
              >
                <PlayIcon /> {t.reminders.soundPreview}
              </Button>
              <Switch
                id="reminder-sound"
                checked={soundOn}
                onCheckedChange={(on) => {
                  setReminderSound(on)
                  setSoundOn(on)
                  if (on) void playChime()
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Notice({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg bg-muted p-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
      {icon}
      <p>{children}</p>
    </div>
  )
}
