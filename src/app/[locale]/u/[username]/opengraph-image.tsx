import { ImageResponse } from "next/og"
import { connection } from "next/server"

import { getDictionary, isLocale } from "@/i18n"
import { getPublicProfile } from "@/lib/data"
import { addDays, todayIn, weekdayMon0 } from "@/lib/dates"
import { OG_TEXT, ogFonts } from "@/lib/og/fonts"
import { LOGO } from "@/lib/og/logo"

export const alt = "Habit streaks on Streakly"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const WEEKS = 16

const SHADES = ["#27272a", "#064e3b", "#047857", "#10b981", "#6ee7b7"]

export default async function Image({ params }: { params: Promise<{ username: string; locale: string }> }) {
  const { username, locale: rawLocale } = await params
  const locale = isLocale(rawLocale) ? rawLocale : "en"
  const t = getDictionary(locale)
  await connection() // uses the current date
  const data = await getPublicProfile(username.toLowerCase())
  const today = todayIn("UTC")

  const name = data ? data.profile.display_name || `@${data.profile.username}` : "Streakly"
  const habits = data?.habits ?? []
  const logs = data?.logs ?? []

  const perDay = new Map<string, number>()
  const byHabit = new Map<string, string[]>()
  for (const l of logs) {
    perDay.set(l.log_date, (perDay.get(l.log_date) ?? 0) + 1)
    byHabit.set(l.habit_id, [...(byHabit.get(l.habit_id) ?? []), l.log_date])
  }
  const best = data?.stats.bestStreak ?? 0
  const max = Math.max(1, habits.length)
  const start = addDays(today, -weekdayMon0(today) - (WEEKS - 1) * 7)

  const level = (n: number) => (n <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((n / max) * 4))))

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#09090b",
          color: "#fafafa",
          fontFamily: OG_TEXT,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, color: "#a1a1aa" }}>
          <img src={LOGO} width={48} height={48} alt="" />
          Streakly
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>{name}</div>
            <div style={{ display: "flex", gap: 32, fontSize: 30, color: "#a1a1aa" }}>
              <span>{t.publicProfile.habits}: {habits.length}</span>
              <span>{t.publicProfile.checkIns}: {logs.length}</span>
              <span style={{ color: "#34d399" }}>{t.publicProfile.bestStreak}: {t.habit.streak(best, "day")}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 5, flexShrink: 0, marginLeft: 48 }}>
            {Array.from({ length: WEEKS }, (_, w) => (
              <div key={w} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {Array.from({ length: 7 }, (_, d) => {
                  const date = addDays(start, w * 7 + d)
                  const bg = date > today ? "transparent" : SHADES[level(perDay.get(date) ?? 0)]
                  return <div key={d} style={{ width: 16, height: 16, borderRadius: 4, background: bg }} />
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() }
  )
}
