"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { getActionT } from "@/i18n/server"
import { getCurrentUser, getToday } from "@/lib/data"
import { addDays } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validation"

const id = z.uuid()
const createSchema = z.object({
  title: z.string().trim().min(1).max(60),
  stake: z.string().trim().max(80).optional().or(z.literal("")),
  habitId: z.uuid(),
  days: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  invitees: z.array(z.uuid()).min(1).max(5),
})
export type CreateChallengeInput = z.infer<typeof createSchema>

async function setup() {
  const [{ t }, user, supabase] = await Promise.all([getActionT(), getCurrentUser(), createClient()])
  return { t, user, supabase }
}

/** Start a challenge today with friends you follow (they get an invite). */
export async function createChallenge(input: CreateChallengeInput): Promise<ActionResult> {
  const { t, user, supabase } = await setup()
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: t.challenges.invalid }
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const { title, stake, habitId, days, invitees } = parsed.data
  const { today } = await getToday()

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({ title, stake: stake || null, start_date: today, end_date: addDays(today, days - 1) })
    .select("id")
    .single()
  if (error || !challenge) return { ok: false, error: error?.message ?? t.common.somethingWrong }

  const { error: meError } = await supabase
    .from("challenge_members")
    .insert({ challenge_id: challenge.id, user_id: user.id, habit_id: habitId, status: "joined", joined_at: new Date().toISOString() })
  const { error: inviteError } = meError
    ? { error: meError }
    : await supabase.from("challenge_members").insert(invitees.map((u) => ({ challenge_id: challenge.id, user_id: u })))
  if (meError || inviteError) {
    await supabase.from("challenges").delete().eq("id", challenge.id) // don't leave a half-made challenge
    return { ok: false, error: (meError ?? inviteError)?.code === "42501" ? t.challenges.notAllowed : t.common.somethingWrong }
  }
  refresh()
  return { ok: true, message: t.challenges.created }
}

/** Join with one of your own habits. */
export async function acceptChallenge(challengeId: string, habitId: string): Promise<ActionResult> {
  const { t, user, supabase } = await setup()
  if (!id.safeParse(challengeId).success || !id.safeParse(habitId).success) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const { data, error } = await supabase
    .from("challenge_members")
    .update({ habit_id: habitId, status: "joined", joined_at: new Date().toISOString() })
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .select("challenge_id")
  if (error) return { ok: false, error: error.code === "42501" ? t.challenges.notAllowed : error.message }
  if (!data?.length) return { ok: false, error: t.challenges.notFound }
  refresh()
  return { ok: true, message: t.challenges.joined }
}

/** Decline an invite or leave; the owner deletes the whole challenge. */
export async function leaveChallenge(challengeId: string): Promise<ActionResult> {
  const { t, user, supabase } = await setup()
  if (!id.safeParse(challengeId).success) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const { data: own } = await supabase.from("challenges").select("id").eq("id", challengeId).eq("owner_id", user.id).maybeSingle()
  const { error } = own
    ? await supabase.from("challenges").delete().eq("id", challengeId)
    : await supabase.from("challenge_members").delete().eq("challenge_id", challengeId).eq("user_id", user.id)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}

/** Same people, same stake, a fresh week (owner only). Members keep their habits as a suggestion — they re-accept. */
export async function rematchChallenge(challengeId: string): Promise<ActionResult> {
  const { t, user, supabase } = await setup()
  if (!id.safeParse(challengeId).success) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const [{ data: c }, { data: members }] = await Promise.all([
    supabase.from("challenges").select("title, stake, start_date, end_date").eq("id", challengeId).eq("owner_id", user.id).maybeSingle(),
    supabase.from("challenge_members").select("user_id, habit_id").eq("challenge_id", challengeId),
  ])
  const mine = members?.find((m) => m.user_id === user.id)
  if (!c || !mine?.habit_id) return { ok: false, error: t.challenges.notFound }
  const span = Math.round((Date.parse(c.end_date) - Date.parse(c.start_date)) / 86_400_000) + 1
  const days = span >= 30 ? 30 : span >= 14 ? 14 : 7
  return createChallenge({
    title: c.title,
    stake: c.stake ?? "",
    habitId: mine.habit_id,
    days,
    invitees: (members ?? []).filter((m) => m.user_id !== user.id).map((m) => m.user_id),
  })
}
