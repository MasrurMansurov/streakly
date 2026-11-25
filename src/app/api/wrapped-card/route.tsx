import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

import { getDictionary, isLocale, type Locale } from "@/i18n"
import { getCurrentUser, getWrappedData } from "@/lib/data"
import type { ISODate } from "@/lib/dates"
import { OG_HEADING, OG_TEXT, ogFonts } from "@/lib/og/fonts"
import { LOGO } from "@/lib/og/logo"
import { buildWrapped } from "@/lib/wrapped"

const W = 1080
const H = 1920
const SHADES = ["#27272a", "#065f46", "#047857", "#10b981", "#34d399"]

/**
 * Year in review as a 9:16 story image (Instagram / Telegram stories).
 * Numbers only — no habit names, so it's safe to post.
 *   GET /api/wrapped-card?locale=en|ru
 */
export async function GET(request: NextRequest) {
  const locale: Locale = isLocale(request.nextUrl.searchParams.get("locale")) ? (request.nextUrl.searchParams.get("locale") as Locale) : "en"
  if (!(await getCurrentUser())) return Response.json({ error: "unauthorized" }, { status: 401 })
  const t = getDictionary(locale)
  const data = await getWrappedData()
  const w = buildWrapped(
    data.habits.map((h) => ({ ...h, done: new Set(h.done), bridges: new Set(h.bridges) })),
    data.year,
    data.today,
    data.hours
  )
  const identity = t.wrapped.identities[w.identity]
  const max = Math.max(1, ...w.perDay.values())
  const level = (n: number) => (n <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((n / max) * 4))))
  const end = (data.today < `${data.year}-12-31` ? data.today : `${data.year}-12-31`) as ISODate

  // year in pixels: 12 rows (months) × up to 31 days
  const months = Array.from({ length: 12 }, (_, m) =>
    Array.from({ length: 31 }, (_, d) => {
      const date = `${data.year}-${String(m + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}` as ISODate
      const valid = new Date(`${date}T00:00:00Z`).getUTCMonth() === m
      if (!valid) return null
      return date > end ? "#18181b" : SHADES[level(w.perDay.get(date) ?? 0)]
    })
  )

  const stat = (value: string, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 96, fontFamily: OG_HEADING, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 34, color: "#a1a1aa" }}>{label}</div>
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
          justifyContent: "space-between",
          padding: "120px 96px",
          background: "#09090b",
          color: "#fafafa",
          fontFamily: OG_TEXT,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 38, color: "#a1a1aa" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} width={60} height={60} alt="" />
            Streakly
          </div>
          <div style={{ fontSize: 84, fontFamily: OG_HEADING, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            {w.firstDays !== null ? t.wrapped.introFirst(w.firstDays) : t.wrapped.introYear(data.year)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
          <div style={{ display: "flex", gap: 80 }}>
            {stat(String(w.checkins), t.wrapped.totalTitle)}
            {stat(String(w.bestStreak), t.wrapped.streakTitle)}
          </div>
          <div style={{ display: "flex", gap: 80 }}>
            {stat(String(w.activeDays), t.wrapped.activeLabel)}
            {w.comebacks > 0 && stat(String(w.comebacks), t.wrapped.comebackTitle)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {months.map((row, m) => (
            <div key={m} style={{ display: "flex", gap: 6 }}>
              {row.map((bg, d) => (
                <div key={d} style={{ width: 22, height: 22, borderRadius: 5, background: bg ?? "transparent" }} />
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "40px 48px", borderRadius: 32, background: "#18181b" }}>
          <div style={{ fontSize: 30, color: "#a1a1aa" }}>{t.wrapped.identityTitle}</div>
          <div style={{ fontSize: 64, fontFamily: OG_HEADING, fontWeight: 700, color: "#34d399" }}>{identity.name}</div>
          <div style={{ fontSize: 32, color: "#d4d4d8", lineHeight: 1.3 }}>{identity.text}</div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: await ogFonts(), headers: { "Cache-Control": "private, no-store" } }
  )
}
