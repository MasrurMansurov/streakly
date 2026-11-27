import { readFileSync } from "node:fs"

import { createClient } from "@supabase/supabase-js"

/**
 * Before every run: put the shared "tester" account back to a clean state.
 *
 * Tests create habits, follows, pauses, pacts and cheers as the tester and clean
 * up after themselves — but a test that fails half-way can't, and then every
 * later test that expects a fresh account fails too (a cascade). Signing in as
 * the tester and deleting its own rows (the normal RLS rules, no service key)
 * makes each run start from the same place.
 *
 * The demo account is not touched: it holds sample data the tests read.
 */
const TESTER = { email: "tester@streakly.dev", password: "streakly-tester" }

function env(name: string): string | undefined {
  if (process.env[name]) return process.env[name]
  try {
    const line = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${name}=`))
    return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "")
  } catch {
    return undefined
  }
}

export default async function globalSetup() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL")
  const key = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  if (!url || !key) {
    console.warn("[e2e setup] Supabase env not found — the tester account is not reset")
    return
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase.auth.signInWithPassword(TESTER)
  if (error || !data.user) throw new Error(`[e2e setup] tester sign-in failed: ${error?.message}`)
  const me = data.user.id

  // order matters only for readability: every delete is scoped to the tester's own rows
  const steps: [string, PromiseLike<{ error: { message: string } | null; count?: number | null }>][] = [
    ["cheers", supabase.from("cheers").delete({ count: "exact" }).eq("from_id", me)],
    ["pacts", supabase.from("pacts").delete({ count: "exact" }).or(`inviter_id.eq.${me},invitee_id.eq.${me}`)],
    ["challenges", supabase.from("challenges").delete({ count: "exact" }).eq("owner_id", me)],
    ["challenge memberships", supabase.from("challenge_members").delete({ count: "exact" }).eq("user_id", me)],
    ["invites", supabase.from("invites").delete({ count: "exact" }).eq("inviter_id", me)],
    ["follows", supabase.from("follows").delete({ count: "exact" }).eq("follower_id", me)],
    ["pauses", supabase.from("pauses").delete({ count: "exact" }).eq("user_id", me)],
    ["moods", supabase.from("daily_moods").delete({ count: "exact" }).eq("user_id", me)],
    // last: removes check-ins, notes, steps, repairs and reminders with them
    ["habits", supabase.from("habits").delete({ count: "exact" }).eq("user_id", me)],
  ]
  const removed: string[] = []
  for (const [what, query] of steps) {
    const { error: e, count } = await query
    if (e) throw new Error(`[e2e setup] could not reset the tester's ${what}: ${e.message}`)
    if (count) removed.push(`${count} ${what}`)
  }
  await supabase.auth.signOut()
  console.log(removed.length ? `[e2e setup] tester reset: removed ${removed.join(", ")}` : "[e2e setup] tester was clean")
}
