import { getCurrentUser } from "@/lib/data"

import { GuestBanner } from "./guest-banner"

/** Server half: only demo guests see the "save your progress" banner. */
export async function GuestGate() {
  const user = await getCurrentUser()
  return user?.isGuest ? <GuestBanner /> : null
}
