import { ImageResponse } from "next/og"

import { getDictionary, isLocale, locales } from "@/i18n"
import { OG_HEADING, OG_TEXT, ogFonts } from "@/lib/og/fonts"
import { LOGO } from "@/lib/og/logo"

export const alt = "Streakly — a free, open-source habit tracker"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

/**
 * The default link preview (Telegram, X, Reddit, Habr…) for every page that
 * has no image of its own: the landing page, leaderboard, demo, legal pages.
 * Profiles and invites keep their personal previews.
 */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const t = getDictionary(isLocale(raw) ? raw : "en")
  const days = [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1]
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#09090b",
          color: "#fafafa",
          fontFamily: OG_TEXT,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, color: "#a1a1aa" }}>
          <img src={LOGO} width={52} height={52} alt="" />
          Streakly
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 66, fontFamily: OG_HEADING, fontWeight: 700, letterSpacing: -2, lineHeight: 1.08 }}>
            {`${t.landing.titleStart} ${t.landing.titleAccent}.`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {days.map((d, i) => (
              <div key={i} style={{ width: 40, height: 40, borderRadius: 10, background: d ? "#10b981" : "#27272a" }} />
            ))}
          </div>
        </div>
        <div style={{ fontSize: 30, color: "#a1a1aa" }}>{t.landing.badge}</div>
      </div>
    ),
    { ...size, fonts: await ogFonts() }
  )
}
