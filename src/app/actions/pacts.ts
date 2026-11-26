"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { getActionT } from "@/i18n/server"
import { getCurrentUser } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validation"
import { guestBlocked } from "@/lib/guest"

const id = z.uuid()

async function setup() {
  const [{ t }, user, supabase] = await Promise.all([getActionT(), getCurrentUser(), createClient()])
  return { t, user, supabase }
}

/** Invite someone you follow into a pact with one of your habits. */
export async function invitePact(inviteeId: string, habitId: string): Promise<ActionResult> {
  const blocked = await guestBlocked()
  if (blocked) return blocked
  const { t, user, supabase } = await setup()
  if (!id.safeParse(inviteeId).success || !id.safeParse(habitId).success) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }

  const { error } = await supabase.from("pacts").insert({ invitee_id: inviteeId, inviter_habit_id: habitId })
  if (error) {
    if (error.code === "23505") return { ok: false, error: t.pacts.exists }
    return { ok: false, error: error.code === "42501" ? t.pacts.notAllowed : error.message }
  }
  refresh()
  return { ok: true, message: t.pacts.invited }
}

/** Accept an invite with one of your habits. */
export async function acceptPact(pactId: string, habitId: string): Promise<ActionResult> {
  const blocked = await guestBlocked()
  if (blocked) return blocked
  const { t, user, supabase } = await setup()
  if (!id.safeParse(pactId).success || !id.safeParse(habitId).success) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }

  const { data, error } = await supabase
    .from("pacts")
    .update({ invitee_habit_id: habitId, status: "active", accepted_at: new Date().toISOString() })
    .eq("id", pactId)
    .eq("invitee_id", user.id)
    .select("id")
  if (error) return { ok: false, error: error.code === "42501" ? t.pacts.notAllowed : error.message }
  if (!data?.length) return { ok: false, error: t.pacts.notFound }
  refresh()
  return { ok: true, message: t.pacts.accepted }
}

/** Decline an invite, cancel your own invite or end an active pact. */
export async function leavePact(pactId: string): Promise<ActionResult> {
  const { t, user, supabase } = await setup()
  if (!id.safeParse(pactId).success) return { ok: false, error: t.validation.invalidInput }
  if (!user) return { ok: false, error: t.validation.notSignedIn }

  // my proof photos go right away (the partner's are cleaned up by the daily job)
  const folder = `${pactId}/${user.id}`
  const { data: files } = await supabase.storage.from("proofs").list(folder)
  if (files?.length) await supabase.storage.from("proofs").remove(files.map((f) => `${folder}/${f.name}`))

  const { error } = await supabase.from("pacts").delete().eq("id", pactId)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}
