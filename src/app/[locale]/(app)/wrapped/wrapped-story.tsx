"use client"

import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, Share2Icon, XIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { track } from "@/app/actions/analytics"
import { Heatmap } from "@/components/heatmap"
import { Link } from "@/components/link"
import { Button } from "@/components/ui/button"
import { formatDay, intlLocale } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { diffDays, type ISODate } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { cn } from "@/lib/utils"
import { buildWrapped, wrappedText } from "@/lib/wrapped"

type Data = {
  year: number
  today: ISODate
  hours: number[]
  habits: { id: string; name: string; color: string; target: number; done: ISODate[]; bridges: ISODate[] }[]
}

/** Story-style year in review: one big fact per screen, tap right / left (or arrows) to move. */
export function WrappedStory({ data }: { data: Data }) {
  const { t, locale } = useI18n()
  const w = useMemo(
    () =>
      buildWrapped(
        data.habits.map((h) => ({ ...h, done: new Set(h.done), bridges: new Set(h.bridges) })),
        data.year,
        data.today,
        data.hours
      ),
    [data]
  )
  const [i, setI] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void track("wrapped_viewed", { year: data.year, first: w.firstDays !== null }).catch(() => {})
  }, [data.year, w.firstDays])

  const monthName = (m: number) => formatDay(locale, `${data.year}-${String(m).padStart(2, "0")}-01`, { month: "long" })
  const weekdayName = (d: number) =>
    new Intl.DateTimeFormat(intlLocale[locale], { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + d)))
  const weeks = Math.min(53, Math.max(4, Math.ceil((diffDays(`${data.year}-01-01`, data.today) + 1) / 7)))
  const identity = t.wrapped.identities[w.identity]

  const share = async (how: "image" | "text") => {
    setBusy(true)
    try {
      const text = wrappedText(
        w,
        {
          title: t.wrapped.textTitle(data.year),
          checkins: t.wrapped.textCheckins(w.checkins),
          streak: t.wrapped.textStreak(w.bestStreak),
          url: window.location.origin,
        },
        data.today
      )
      if (how === "text") {
        await navigator.clipboard.writeText(text)
        toast.success(t.wrapped.copied)
      } else {
        const res = await fetch(`/api/wrapped-card?locale=${locale}`)
        if (!res.ok) throw new Error(String(res.status))
        const file = new File([await res.blob()], `streakly-${data.year}.png`, { type: "image/png" })
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text })
        else {
          const url = URL.createObjectURL(file)
          Object.assign(document.createElement("a"), { href: url, download: file.name }).click()
          URL.revokeObjectURL(url)
        }
      }
      void track("wrapped_shared", { how, year: data.year }).catch(() => {})
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error(t.common.somethingWrong)
    } finally {
      setBusy(false)
    }
  }

  const slides: { key: string; body: React.ReactNode }[] = [
    {
      key: "intro",
      body: (
        <>
          <Big>{w.firstDays !== null ? t.wrapped.introFirst(w.firstDays) : t.wrapped.introYear(data.year)}</Big>
          <Sub>{t.wrapped.introSub}</Sub>
        </>
      ),
    },
    {
      key: "total",
      body: (
        <>
          <Label>{t.wrapped.totalTitle}</Label>
          <Number>{w.checkins}</Number>
          <Sub>{t.wrapped.activeDays(w.activeDays, w.daysInRange)}</Sub>
        </>
      ),
    },
    {
      key: "streak",
      body: (
        <>
          <Label>{t.wrapped.streakTitle}</Label>
          {w.bestStreak > 0 ? <Number>{t.habit.streak(w.bestStreak, "day")}</Number> : <Big>{t.wrapped.streakNone}</Big>}
        </>
      ),
    },
    ...(w.topHabit
      ? [
          {
            key: "top",
            body: (
              <>
                <Label>{t.wrapped.topTitle}</Label>
                <Big>
                  <span className={cn("mr-3 inline-block size-4 rounded-full align-middle", habitColor(w.topHabit.color).dot)} aria-hidden />
                  {w.topHabit.name}
                </Big>
                <Sub>{t.wrapped.topSub(w.topHabit.checkins)}</Sub>
                {w.bestMonth && w.bestWeekday && (
                  <dl className="mt-8 grid grid-cols-2 gap-4 text-left">
                    <div>
                      <dt className="text-xs text-muted-foreground">{t.wrapped.monthTitle}</dt>
                      <dd className="text-lg font-semibold capitalize">{monthName(w.bestMonth.month)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t.wrapped.weekdayTitle}</dt>
                      <dd className="text-lg font-semibold capitalize">{weekdayName(w.bestWeekday.day)}</dd>
                    </div>
                  </dl>
                )}
              </>
            ),
          },
        ]
      : []),
    ...(w.comebacks > 0
      ? [
          {
            key: "comebacks",
            body: (
              <>
                <Label>{t.wrapped.comebackTitle}</Label>
                <Number>{t.wrapped.comebackValue(w.comebacks)}</Number>
                <Sub>{t.wrapped.comebackSub}</Sub>
              </>
            ),
          },
        ]
      : []),
    {
      key: "pixels",
      body: (
        <>
          <Label>{t.wrapped.pixelsTitle}</Label>
          <div className="mt-4 w-full overflow-x-auto">
            <Heatmap counts={w.perDay} max={Math.max(1, data.habits.length)} today={data.today} weeks={weeks} locale={locale} />
          </div>
        </>
      ),
    },
    {
      key: "identity",
      body: (
        <>
          <Label>{t.wrapped.identityTitle}</Label>
          <Big>{identity.name}</Big>
          <Sub>{identity.text}</Sub>
        </>
      ),
    },
    {
      key: "share",
      body: (
        <>
          <Big>{t.wrapped.shareTitle}</Big>
          <Sub>{t.wrapped.shareSub}</Sub>
          <div className="mt-8 grid w-full gap-2">
            <Button size="lg" className="h-11" disabled={busy} onClick={() => share("image")}>
              <Share2Icon aria-hidden /> {t.wrapped.shareImage}
            </Button>
            <Button size="lg" variant="outline" className="h-11" disabled={busy} onClick={() => share("text")}>
              <CopyIcon aria-hidden /> {t.wrapped.copyText}
            </Button>
          </div>
        </>
      ),
    },
  ]

  const last = slides.length - 1
  const go = useCallback((delta: number) => setI((n) => Math.min(last, Math.max(0, n + delta))), [last])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go])

  if (w.checkins === 0) {
    return <p className="py-20 text-center text-sm text-muted-foreground">{t.wrapped.empty}</p>
  }

  return (
    <div className="mx-auto grid w-full max-w-sm gap-3">
      {/* progress */}
      <div className="flex gap-1" aria-hidden>
        {slides.map((s, n) => (
          <span key={s.key} className={cn("h-1 flex-1 rounded-full transition-colors", n <= i ? "bg-foreground" : "bg-muted")} />
        ))}
      </div>

      <section
        aria-roledescription="slide"
        aria-label={t.wrapped.slide(i + 1, slides.length)}
        className="relative flex min-h-[28rem] flex-col items-center justify-center rounded-2xl border bg-card px-6 py-10 text-center"
      >
        <div key={slides[i].key} className="grid w-full justify-items-center motion-safe:animate-rise">
          {slides[i].body}
        </div>
        {/* tap zones (the share screen keeps its buttons clickable) */}
        {i < last && (
          <>
            <button type="button" aria-label={t.wrapped.prev} className="absolute inset-y-0 left-0 w-1/3 outline-none" onClick={() => go(-1)} tabIndex={-1} />
            <button type="button" aria-label={t.wrapped.next} className="absolute inset-y-0 right-0 w-2/3 outline-none" onClick={() => go(1)} tabIndex={-1} />
          </>
        )}
      </section>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => go(-1)} disabled={i === 0}>
          <ChevronLeftIcon aria-hidden /> {t.wrapped.prev}
        </Button>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
          <XIcon aria-hidden /> {t.wrapped.close}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => go(1)} disabled={i === last}>
          {t.wrapped.next} <ChevronRightIcon aria-hidden />
        </Button>
      </div>
    </div>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>
const Number = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-2 text-5xl font-semibold tracking-tight sm:text-6xl">{children}</p>
)
const Big = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-2 text-3xl leading-tight font-semibold tracking-tight text-balance">{children}</p>
)
const Sub = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 max-w-xs text-sm text-muted-foreground text-balance">{children}</p>
)
