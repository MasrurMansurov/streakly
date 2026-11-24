"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { getActionT } from "@/i18n/server"
import { getCurrentUser, getToday } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validation"

const MAX_BYTES = 3 * 1024 * 1024
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

/** Attach a photo and/or a note to today's check-in in a pact. */
export async function saveProof(form: FormData): Promise<ActionResult> {
  const [{ t }, user, supabase] = await Promise.all([getActionT(), getCurrentUser(), createClient()])
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const pactId = String(form.get("pactId") ?? "")
  const note = String(form.get("note") ?? "").trim().slice(0, 140)
  const photo = form.get("photo")
  if (!z.uuid().safeParse(pactId).success) return { ok: false, error: t.validation.invalidInput }
  const file = photo instanceof File && photo.size > 0 ? photo : null
  if (!file && !note) return { ok: false, error: t.proof.empty }
  if (file && (!TYPES[file.type] || file.size > MAX_BYTES)) return { ok: false, error: t.proof.badPhoto }
  const { today } = await getToday()

  const { data: existing } = await supabase
    .from("pact_proofs")
    .select("photo_path")
    .eq("pact_id", pactId)
    .eq("user_id", user.id)
    .eq("day", today)
    .maybeSingle()

  let photoPath = existing?.photo_path ?? null
  if (file) {
    photoPath = `${pactId}/${user.id}/${today}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}.${TYPES[file.type]}`
    const { error } = await supabase.storage.from("proofs").upload(photoPath, file, { contentType: file.type })
    if (error) return { ok: false, error: t.proof.notCheckedIn }
  }

  const row = { note: note || null, photo_path: photoPath }
  const { error } = existing
    ? await supabase.from("pact_proofs").update(row).eq("pact_id", pactId).eq("user_id", user.id).eq("day", today)
    : await supabase.from("pact_proofs").insert({ pact_id: pactId, day: today, ...row })
  if (error) {
    if (file && photoPath) await supabase.storage.from("proofs").remove([photoPath])
    return { ok: false, error: error.code === "42501" ? t.proof.notCheckedIn : error.message }
  }
  // replaced photo → remove the old file
  if (file && existing?.photo_path) await supabase.storage.from("proofs").remove([existing.photo_path])
  refresh()
  return { ok: true, message: t.proof.saved }
}

/** Remove today's proof (and its photo). */
export async function deleteProof(pactId: string): Promise<ActionResult> {
  const [{ t }, user, supabase] = await Promise.all([getActionT(), getCurrentUser(), createClient()])
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  if (!z.uuid().safeParse(pactId).success) return { ok: false, error: t.validation.invalidInput }
  const { today } = await getToday()
  const { data } = await supabase
    .from("pact_proofs")
    .delete()
    .eq("pact_id", pactId)
    .eq("user_id", user.id)
    .eq("day", today)
    .select("photo_path")
  const path = data?.[0]?.photo_path
  if (path) await supabase.storage.from("proofs").remove([path])
  refresh()
  return { ok: true }
}
