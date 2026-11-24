import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

import { getDictionary, intlLocale, isLocale, type Locale } from "@/i18n"
import { getShareData } from "@/lib/data"
import { addDays, weekdayMon0, type ISODate } from "@/lib/dates"
import { LOGO } from "@/lib/og/logo"
import { OG_HEADING, OG_TEXT, ogFonts } from "@/lib/og/fonts"
import { dayLevel, emojiGrid, SHARE_PERIODS, summarize, type SharePeriod, type ShareSummary } from "@/lib/share"

const SIZE = 1080
const COLORS: Record<string, string> = {
  emerald: "#10b981",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  amber: "#f59e0b",
  slate: "#64748b",
}
const EMPTY = "#27272a"
const FUTURE = "#18181b"
const LEVEL = [EMPTY, "#065f46", "#10b981"]

function headings(period: SharePeriod, s: ShareSummary, locale: Locale) {
  const t = getDictionary(locale).share
  const date = (d: ISODate, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale[locale], { ...o, timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`))
  if (period === "week") {
    return { title: t.heading.week, subtitle: `${date(s.start, { day: "numeric", month: "short" })} – ${date(s.end, { day: "numeric", month: "short" })}` }
  }
  if (period === "month") {
    return { title: t.heading.month(date(s.start, { month: "long" })), subtitle: date(s.start, { year: "numeric" }) }
  }
  return { title: t.heading.year(s.start.slice(0, 4)), subtitle: "" }
}

/**
 * Shareable progress card (PNG) or its Wordle-style text, for the signed-in user.
 *   GET /api/share-card?period=week|month|year&locale=en|ru[&format=text]
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams
  const period = (SHARE_PERIODS as string[]).includes(q.get("period") ?? "") ? (q.get("period") as SharePeriod) : "week"
  const locale: Locale = isLocale(q.get("locale")) ? (q.get("locale") as Locale) : "en"
  const t = getDictionary(locale)

  const data = await getShareData(period)
  if (!data) return Response.json({ error: "unauthorized" }, { status: 401 })
  const { today, name, habits } = data
  const s = summarize(habits, period, today)
  const { title, subtitle } = headings(period, s, locale)
  const streakText = `${s.streak.current} ${t.share.streak(s.streak.unit)}`
  const noStore = { "Cache-Control": "private, no-store" }

  if (q.get("format") === "text") {
    const text = t.share.text(`${title}${subtitle ? ` · ${subtitle}` : ""}`, emojiGrid(s, period, today), s.checkins, streakText)
    return new Response(`${text}\n${request.nextUrl.origin}`, { headers: { "Content-Type": "text/plain; charset=utf-8", ...noStore } })
  }

  const stat = (value: string | number, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "28px 32px", borderRadius: 28, background: "#18181b" }}>
      <div style={{ fontFamily: OG_HEADING, fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{String(value)}</div>
      <div style={{ marginTop: 12, fontSize: 26, color: "#a1a1aa" }}>{label}</div>
    </div>
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 72,
          background: "linear-gradient(160deg, #0b1f18 0%, #09090b 45%)",
          color: "#fafafa",
          fontFamily: OG_TEXT,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} width={60} height={60} alt="" />
            <div style={{ fontFamily: OG_HEADING, fontSize: 38, fontWeight: 700 }}>streakly</div>
          </div>
          <div style={{ fontSize: 30, color: "#a1a1aa" }}>{name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
          <div style={{ fontFamily: OG_HEADING, fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
          {subtitle && <div style={{ marginTop: 14, fontSize: 32, color: "#a1a1aa" }}>{subtitle}</div>}
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 44 }}>
          {stat(s.checkins, t.share.checkins)}
          {stat(`${s.activeDays}/${s.daysSoFar}`, t.share.activeDaysShort)}
          {stat(s.streak.current, t.share.streak(s.streak.unit))}
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", marginTop: 36 }}>
          {s.checkins === 0 ? (
            <div style={{ fontSize: 34, color: "#71717a" }}>{t.share.empty}</div>
          ) : period === "week" ? (
            <WeekGrid habits={habits} s={s} today={today} locale={locale} />
          ) : period === "month" ? (
            <MonthGrid s={s} today={today} />
          ) : (
            <YearGrid s={s} today={today} />
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#71717a" }}>
          <div style={{ display: "flex" }}>
            {period === "year" && s.topHabit ? t.share.topHabit(s.topHabit.name, s.topHabit.checkins) : t.share.longestRun(s.longestRun)}
          </div>
          <div style={{ display: "flex" }}>{request.nextUrl.host}</div>
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE, fonts: await ogFonts(), headers: noStore }
  )
}

/** One row per habit (up to 5), Mon–Sun squares in the habit's colour. */
function WeekGrid({
  habits,
  s,
  today,
  locale,
}: {
  habits: { id: string; name: string; color: string; done: ReadonlySet<ISODate> }[]
  s: ShareSummary
  today: ISODate
  locale: Locale
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(s.start, i))
  const weekday = (d: ISODate) =>
    new Intl.DateTimeFormat(intlLocale[locale], { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`)).slice(0, 2)
  const rows = habits.slice(0, 5)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, marginLeft: 280 }}>
        {days.map((d) => (
          <div key={d} style={{ width: 72, display: "flex", justifyContent: "center", fontSize: 22, color: "#71717a", textTransform: "uppercase" }}>
            {weekday(d)}
          </div>
        ))}
      </div>
      {rows.map((h) => (
        <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 268, fontSize: 28, color: "#d4d4d8", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {h.name}
          </div>
          {days.map((d) => (
            <div
              key={d}
              style={{
                width: 72,
                height: 48,
                borderRadius: 12,
                background: h.done.has(d) ? (COLORS[h.color] ?? COLORS.emerald) : d > today ? FUTURE : EMPTY,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Calendar month: weeks as rows, each day coloured by how many habits were done. */
function MonthGrid({ s, today }: { s: ShareSummary; today: ISODate }) {
  const first = addDays(s.start, -weekdayMon0(s.start))
  const weeks: ISODate[][] = []
  for (let w = first; w <= s.end; w = addDays(w, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)))
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {weeks.map((week) => (
        <div key={week[0]} style={{ display: "flex", gap: 12 }}>
          {week.map((d) => {
            const outside = d < s.start || d > s.end
            return (
              <div
                key={d}
                style={{
                  width: 76,
                  height: 46,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#a1a1aa",
                  background: outside ? "transparent" : d > today ? FUTURE : LEVEL[dayLevel(s.perDay.get(d) ?? 0, s.habits)],
                }}
              >
                {outside ? "" : String(Number(d.slice(8)))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** GitHub-style year heatmap: 53 weeks × 7 days. */
function YearGrid({ s, today }: { s: ShareSummary; today: ISODate }) {
  const first = addDays(s.start, -weekdayMon0(s.start))
  const columns: ISODate[][] = []
  for (let w = first; w <= s.end; w = addDays(w, 7)) columns.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)))
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {columns.map((col) => (
        <div key={col[0]} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {col.map((d) => (
            <div
              key={d}
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: d < s.start || d > s.end ? "transparent" : d > today ? FUTURE : LEVEL[dayLevel(s.perDay.get(d) ?? 0, s.habits)],
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
