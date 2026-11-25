"use server"

import { refresh, updateTag } from "next/cache"

import { z } from "zod"

import { evaluateAchievements, statsFromRow } from "@/lib/achievements"
import { ACCENTS, BANNERS, FRAMES, normalizeLink, type AccentKey, type BannerKey } from "@/lib/profile-style"
import { getCurrentUser } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import { validationMessage } from "@/i18n"
import { getActionT } from "@/i18n/server"
import { profileSchema, type ActionResult, type ProfileInput } from "@/lib/validation"

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const { t } = await getActionT()
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: validationMessage(t, parsed.error.issues[0]?.message) }

  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }

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
    if (error.code === "23505") return { ok: false, error: t.settings.usernameTaken }
    return { ok: false, error: error.message }
  }

  if (before) updateTag(`profile:${before.username}`)
  updateTag(`profile:${parsed.data.username}`)
  refresh()
  return { ok: true, message: t.settings.saved }
}

/**
 * Save (or clear) the avatar URL after the client uploaded the file to Storage.
 * Only URLs inside the user's own folder of the public "avatars" bucket are accepted.
 */
export async function updateAvatar(url: string | null): Promise<ActionResult> {
  const { t } = await getActionT()
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }

  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`
  // only a plain file name inside the user's folder (no "../", no query string)
  if (url !== null && (!url.startsWith(prefix) || !/^avatar-\d+\.(png|jpg|webp|gif)$/.test(url.slice(prefix.length)))) {
    return { ok: false, error: t.validation.invalidAvatar }
  }

  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id)
    .select("username")
    .single()
  if (error) return { ok: false, error: error.message }

  // remove older files from the user's folder
  const keep = url?.slice(prefix.length)
  const { data: files } = await supabase.storage.from("avatars").list(user.id)
  // only old avatars — the folder also holds the profile banner
  const stale = (files ?? []).filter((f) => f.name.startsWith("avatar-") && f.name !== keep).map((f) => `${user.id}/${f.name}`)
  if (stale.length) await supabase.storage.from("avatars").remove(stale)

  updateTag(`profile:${profile.username}`)
  refresh()
  return { ok: true, message: url ? t.settings.avatarUpdated : t.settings.avatarRemoved }
}

const appearanceSchema = z.object({
  banner: z.enum(Object.keys(BANNERS) as [BannerKey, ...BannerKey[]]),
  accent: z.enum(Object.keys(ACCENTS) as [AccentKey, ...AccentKey[]]),
  avatarFrame: z.enum(FRAMES),
  status: z.string().trim().max(60),
  pronouns: z.string().trim().max(20),
  links: z.array(z.string()).max(3),
  showcase: z.array(z.string()).max(3),
  featuredHabitId: z.uuid().nullable(),
})
export type AppearanceInput = z.infer<typeof appearanceSchema>

/** Banner, accent, frame, status, pronouns, links, badge showcase, pinned habit. */
export async function updateAppearance(input: AppearanceInput): Promise<ActionResult> {
  const { t } = await getActionT()
  const parsed = appearanceSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: t.validation.invalidInput }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const v = parsed.data

  const links: string[] = []
  for (const raw of v.links) {
    if (!raw.trim()) continue
    const url = normalizeLink(raw)
    if (!url) return { ok: false, error: t.appearance.badLink(raw.slice(0, 40)) }
    links.push(url)
  }

  const supabase = await createClient()
  // only badges you have actually earned can be shown off
  const { data: stats } = await supabase.rpc("achievement_stats", { p_user: user.id })
  const earned = new Set(
    evaluateAchievements(statsFromRow(stats?.[0]))
      .filter((a) => a.earned)
      .map((a) => a.id as string)
  )
  const showcase = v.showcase.filter((id) => earned.has(id))

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      banner: v.banner,
      accent: v.accent,
      avatar_frame: v.avatarFrame,
      status: v.status || null,
      pronouns: v.pronouns || null,
      links,
      showcase,
      featured_habit_id: v.featuredHabitId,
    })
    .eq("id", user.id)
    .select("username")
    .single()
  if (error) return { ok: false, error: error.message }
  updateTag(`profile:${profile.username}`)
  refresh()
  return { ok: true, message: t.appearance.saved }
}

/** Own banner image (uploaded to the avatars bucket by the browser), or null to go back to a preset. */
export async function updateBanner(url: string | null): Promise<ActionResult> {
  const { t } = await getActionT()
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`
  if (url !== null && (!url.startsWith(prefix) || !/^banner-\d+\.(png|jpg|webp)$/.test(url.slice(prefix.length)))) {
    return { ok: false, error: t.validation.invalidInput }
  }
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ banner_url: url })
    .eq("id", user.id)
    .select("username")
    .single()
  if (error) return { ok: false, error: error.message }

  const keep = url?.slice(prefix.length)
  const { data: files } = await supabase.storage.from("avatars").list(user.id)
  const stale = (files ?? []).filter((f) => f.name.startsWith("banner-") && f.name !== keep).map((f) => `${user.id}/${f.name}`)
  if (stale.length) await supabase.storage.from("avatars").remove(stale)

  updateTag(`profile:${profile.username}`)
  refresh()
  return { ok: true }
}
