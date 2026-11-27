"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { getActionT } from "@/i18n/server"
import { getCurrentUser } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validation"
import { guestBlocked } from "@/lib/guest"
import { dbFailure } from "@/lib/action-error"

export async function setFollowing(profileId: string, follow: boolean): Promise<ActionResult> {
  const blocked = await guestBlocked()
  if (blocked) return blocked
  const { t } = await getActionT()
  if (!z.uuid().safeParse(profileId).success) return { ok: false, error: t.validation.invalidInput }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  if (user.id === profileId) return { ok: false, error: t.friends.cantFollowSelf }

  const supabase = await createClient()
  const { error } = follow
    ? await supabase.from("follows").insert({ following_id: profileId })
    : await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileId)

  // 23505: already following — fine
  if (error && error.code !== "23505") {
    // RLS rejects following a private profile
    return { ok: false, error: error.code === "42501" ? t.friends.privateProfile : dbFailure(t, error) }
  }
  refresh()
  return { ok: true }
}
