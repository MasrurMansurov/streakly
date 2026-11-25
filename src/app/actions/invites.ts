"use server"

import { cookies } from "next/headers"
import { refresh } from "next/cache"
import { z } from "zod"

import { getActionT } from "@/i18n/server"
import { getCurrentUser } from "@/lib/data"
import { INVITE_COOKIE, isInviteCode, newInviteCode } from "@/lib/invite"
import { createClient } from "@/lib/supabase/server"

/** This user's invite link code, optionally for one habit (reused if it exists). */
export async function getInviteCode(habitId?: string | null): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const { t } = await getActionT()
  if (habitId && !z.uuid().safeParse(habitId).success) return { ok: false, error: t.validation.invalidInput }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const supabase = await createClient()

  const find = async () => {
    const q = supabase.from("invites").select("code").eq("inviter_id", user.id)
    const { data } = await (habitId ? q.eq("habit_id", habitId) : q.is("habit_id", null)).maybeSingle()
    return data?.code ?? null
  }
  const found = await find()
  if (found) return { ok: true, code: found }

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newInviteCode()
    const { error } = await supabase.from("invites").insert({ code, habit_id: habitId ?? null })
    if (!error) return { ok: true, code }
    if (error.code !== "23505") return { ok: false, error: error.message }
    // 23505 on (inviter, habit): created meanwhile in another tab → read it; else a code clash → retry
    const existing = await find()
    if (existing) return { ok: true, code: existing }
  }
  return { ok: false, error: t.common.somethingWrong }
}

/**
 * Accept an invite (the code from the link, or the cookie the invite page left
 * before sign-up). Follows each other; with a habit attached, a pact proposal.
 */
export async function acceptInvite(code?: string): Promise<{ inviter: string; pact: boolean } | null> {
  const jar = await cookies()
  const value = code ?? jar.get(INVITE_COOKIE)?.value
  if (jar.get(INVITE_COOKIE)) jar.delete(INVITE_COOKIE)
  if (!isInviteCode(value)) return null
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase.rpc("accept_invite", { p_code: value })
  const row = data?.[0]
  if (!row?.inviter_username) return null
  await supabase.from("events").insert({ name: "invite_accepted", props: { pact: row.pact_proposed } })
  refresh()
  return { inviter: row.inviter_username, pact: row.pact_proposed }
}
