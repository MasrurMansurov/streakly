import "server-only"

import type { createClient } from "@/lib/supabase/server"

/** If `habitId` is part of an active pact, ask the Edge Function to nudge the partner. */
export async function nudgePactPartner(supabase: Awaited<ReturnType<typeof createClient>>, habitId: string) {
  const { data: pact } = await supabase
    .from("pacts")
    .select("id")
    .eq("status", "active")
    .or(`inviter_habit_id.eq.${habitId},invitee_habit_id.eq.${habitId}`)
    .limit(1)
  if (!pact?.length) return
  const { error } = await supabase.functions.invoke("send-reminders", { body: { action: "pact", habitId } })
  if (error) console.error("pact nudge failed", error)
}
