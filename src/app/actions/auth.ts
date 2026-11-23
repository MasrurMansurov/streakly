"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { authSchema, type ActionResult, type AuthInput } from "@/lib/validation"

export async function signIn(input: AuthInput): Promise<ActionResult> {
  const parsed = authSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid email or password" }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { ok: false, error: error.message }

  redirect("/dashboard")
}

export async function signUp(input: AuthInput): Promise<ActionResult> {
  const parsed = authSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid email or password" }

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
  })
  if (error) return { ok: false, error: error.message }

  // "Confirm email" disabled in Supabase → we already have a session
  if (data.session) redirect("/dashboard")

  return { ok: true, message: "Check your inbox to confirm your email." }
}

export async function signOut() {
  const supabase = await createClient()
  // "local": sign out of this browser only. The default ("global") would also end
  // the user's sessions on every other device.
  await supabase.auth.signOut({ scope: "local" })
  redirect("/")
}
