import { getActionT } from "@/i18n/server"

import { getCurrentUser } from "./data"
import type { ActionResult } from "./validation"

/**
 * Social and paid features are for accounts, not demo guests (the database
 * refuses them too — this is the friendly message). null = go ahead.
 */
export async function guestBlocked(): Promise<Extract<ActionResult, { ok: false }> | null> {
  const user = await getCurrentUser()
  if (!user?.isGuest) return null
  const { t } = await getActionT()
  return { ok: false, error: t.demo.needAccount }
}
