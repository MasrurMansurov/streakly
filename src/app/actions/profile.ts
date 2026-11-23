"use server"

import { refresh, updateTag } from "next/cache"

import { getCurrentUser } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import { profileSchema, type ActionResult, type ProfileInput } from "@/lib/validation"

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Not signed in" }

  const supabase = await createClient()
  const { data: before } = await supabase.from("profiles").select("username").eq("id", user.id).single()

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.display_name || null,
      bio: parsed.data.bio || null,
      is_public: parsed.data.is_public,
    })
    .eq("id", user.id)

  if (error) {
    if (error.code === "23505") return { ok: false, error: "This username is already taken" }
    return { ok: false, error: error.message }
  }

  if (before) updateTag(`profile:${before.username}`)
  updateTag(`profile:${parsed.data.username}`)
  refresh()
  return { ok: true, message: "Profile saved" }
}
