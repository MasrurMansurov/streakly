import { getT } from "@/i18n/server"
import { getCurrentUser } from "@/lib/data"

import { FriendsTabLinks } from "./friends-tab-links"

/**
 * Friends and the leaderboard are one section with two views. Shown to signed-in
 * people only — the public leaderboard page stays the same for everyone else
 * (and for search engines).
 */
export async function FriendsTabs() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getT()])
  if (!user) return null
  return <FriendsTabLinks label={t.nav.friends} following={t.nav.following} leaderboard={t.nav.leaderboard} />
}
