"use server"

import { updateTag } from "next/cache"

import { getActionT } from "@/i18n/server"
import { toCsv } from "@/lib/csv"
import { getCurrentUser } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import { dbFailure } from "@/lib/action-error"

const PAGE = 1000

/** All rows of a query, page by page (PostgREST returns at most 1000 at a time). */
async function all<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}

export type ExportResult = { ok: true; filename: string; csv: string } | { ok: false; error: string }

/** Every check-in (with its note) as CSV; habits without check-ins get one empty row. */
export async function exportMyData(): Promise<ExportResult> {
  const { t } = await getActionT()
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const supabase = await createClient()

  try {
    const [habits, logs, notes] = await Promise.all([
      all((a, b) =>
        supabase
          .from("habits")
          .select("id, name, description, color, target_per_week, created_at, archived_at")
          .eq("user_id", user.id)
          .order("position")
          .range(a, b)
      ),
      all((a, b) =>
        supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", user.id).order("log_date").range(a, b)
      ),
      all((a, b) =>
        supabase.from("habit_notes").select("habit_id, log_date, note").eq("user_id", user.id).range(a, b)
      ),
    ])

    const noteOf = new Map(notes.map((n) => [`${n.habit_id}|${n.log_date}`, n.note]))
    const rows: (string | number | null)[][] = [
      ["habit", "description", "color", "times_per_week", "created", "archived", "date", "note"],
    ]
    for (const h of habits) {
      const base = [h.name, h.description, h.color, h.target_per_week, h.created_at.slice(0, 10), h.archived_at?.slice(0, 10) ?? null]
      const own = logs.filter((l) => l.habit_id === h.id)
      if (own.length === 0) rows.push([...base, null, null])
      for (const l of own) rows.push([...base, l.log_date, noteOf.get(`${h.id}|${l.log_date}`) ?? null])
    }

    const today = new Date().toISOString().slice(0, 10)
    // BOM so Excel opens UTF-8 (Cyrillic) correctly
    return { ok: true, filename: `streakly-${today}.csv`, csv: "﻿" + toCsv(rows) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Permanently deletes the signed-in user and all their data. `confirm` must equal their username. */
export async function deleteMyAccount(confirm: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { t } = await getActionT()
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: t.validation.notSignedIn }
  const supabase = await createClient()

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single()
  if (!profile || confirm.trim().toLowerCase() !== profile.username) {
    return { ok: false, error: t.account.confirmMismatch }
  }

  // Files first — Storage can't be cleaned up from SQL, and rows that point to
  // them are about to disappear. Then the account itself: its rows (push
  // subscriptions included, so nothing is sent to a deleted user) cascade.
  // Avatar and banner:
  const { data: files } = await supabase.storage.from("avatars").list(user.id)
  if (files?.length) await supabase.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`))
  // Pact proof photos (the partner's own photos go with the pact in the nightly cleanup):
  const { data: proofs } = await supabase.from("pact_proofs").select("photo_path").eq("user_id", user.id).not("photo_path", "is", null)
  const photos = (proofs ?? []).flatMap((p) => (p.photo_path ? [p.photo_path] : []))
  if (photos.length) await supabase.storage.from("proofs").remove(photos)

  const { error } = await supabase.rpc("delete_my_account")
  if (error) return { ok: false, error: dbFailure(t, error) }

  await supabase.auth.signOut({ scope: "local" }) // clears the session cookies
  updateTag(`profile:${profile.username}`)
  return { ok: true }
}
