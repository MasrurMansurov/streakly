import { ImageResponse } from "next/og"
import { connection } from "next/server"

import { getDictionary, isLocale } from "@/i18n"
import { isInviteCode } from "@/lib/invite"
import { HABIT_COLORS, type HabitColor } from "@/lib/habit-colors"
import { OG_TEXT, ogFonts } from "@/lib/og/fonts"
import { LOGO } from "@/lib/og/logo"
import { createPublicClient } from "@/lib/supabase/server"

export const alt = "An invite to Streakly"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** The link preview in Telegram / WhatsApp / X: who invites you, and to which habit. */
export default async function Image({ params }: { params: Promise<{ code: string; locale: string }> }) {
  const { code, locale: rawLocale } = await params
  const t = getDictionary(isLocale(rawLocale) ? rawLocale : "en")
  await connection()
  const { data } = isInviteCode(code) ? await createPublicClient().rpc("invite_preview", { p_code: code }) : { data: null }
  const invite = data?.[0]
  const name = invite?.inviter_name ?? "Streakly"
  const habitHex = invite?.habit_color && invite.habit_color in HABIT_COLORS ? HABIT_COLORS[invite.habit_color as HabitColor].hex : "#10b981"

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
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, color: "#a1a1aa" }}>
          <img src={LOGO} width={48} height={48} alt="" />
          Streakly
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>{t.invite.title(name)}</div>
          {invite?.habit_name ? (
            <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40 }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: habitHex }} />
              {invite.habit_name}
              {invite.habit_checkins_30 !== null && (
                <span style={{ color: "#a1a1aa", fontSize: 30, marginLeft: 12 }}>· {t.invite.recent(invite.habit_checkins_30)}</span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 34, color: "#a1a1aa" }}>{t.invite.noHabit}</div>
          )}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() }
  )
}
