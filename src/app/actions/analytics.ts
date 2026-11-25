"use server"

import { cookies } from "next/headers"
import { z } from "zod"

import { getCurrentUser } from "@/lib/data"
import { ATTRIBUTION_COOKIE, cleanTag } from "@/lib/attribution"
import { createClient } from "@/lib/supabase/server"

const EVENTS = [
  "share_opened",
  "share_done",
  "invite_link_copied",
  "invite_opened",
  "invite_accepted",
  "wrapped_viewed",
  "wrapped_shared",
] as const
export type GrowthEvent = (typeof EVENTS)[number]

const eventSchema = z.object({
  name: z.enum(EVENTS),
  props: z.record(z.string().max(32), z.union([z.string().max(64), z.number(), z.boolean()])).optional(),
})

/** Record a growth event for the signed-in user (fire-and-forget; never throws). */
export async function track(name: GrowthEvent, props?: Record<string, string | number | boolean>): Promise<void> {
  const parsed = eventSchema.safeParse({ name, props })
  if (!parsed.success) return
  const user = await getCurrentUser()
  if (!user) return
  const supabase = await createClient()
  await supabase.from("events").insert({ name: parsed.data.name, props: parsed.data.props ?? {} })
}

/**
 * Save where a NEW user came from (the first-touch cookie), once. Accounts older
 * than two days are left alone: their cookie says nothing about how they joined.
 */
export async function saveAttribution(): Promise<void> {
  const jar = await cookies()
  const raw = jar.get(ATTRIBUTION_COOKIE)?.value
  const user = await getCurrentUser()
  if (!user) return
  const supabase = await createClient()
  const { data: profile } = await supabase.from("profiles").select("created_at").eq("id", user.id).single()
  const isNew = profile && Date.now() - new Date(profile.created_at).getTime() < 2 * 86_400_000
  if (isNew) {
    let parsed: { source?: string; ref?: string; landing?: string } = {}
    try {
      parsed = raw ? JSON.parse(decodeURIComponent(raw)) : {}
    } catch {}
    const source = cleanTag(parsed.source) ?? "direct"
    // 23505: already saved (another tab or device)
    await supabase.from("user_attribution").insert({
      source,
      ref: cleanTag(parsed.ref) ?? null,
      landing: typeof parsed.landing === "string" ? parsed.landing.slice(0, 200) : null,
    })
  }
  if (raw) jar.delete(ATTRIBUTION_COOKIE)
}
