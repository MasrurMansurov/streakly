/**
 * The app's sections, in one place — the header (desktop), the tab bar (phones),
 * the account menu and the Profile hub all read from here, so an item has one
 * home and one name everywhere.
 */
export type Section = "today" | "progress" | "friends" | "me"

/** Daily sections, always visible. "me" (Profile) is a tab on phones only; on desktop it's the avatar menu. */
export const SECTIONS: readonly { id: Section; href: string; phoneOnly?: true }[] = [
  { id: "today", href: "/dashboard" },
  { id: "progress", href: "/progress" },
  { id: "friends", href: "/friends" },
  { id: "me", href: "/me", phoneOnly: true },
]

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

/** Which section a (locale-less) path belongs to — a habit is part of Today, the leaderboard of Friends. */
export function sectionOf(path: string): Section | null {
  if (under(path, "/dashboard") || under(path, "/habits")) return "today"
  if (under(path, "/progress")) return "progress"
  if (under(path, "/friends") || under(path, "/leaderboard")) return "friends"
  if (under(path, "/me") || under(path, "/archive") || under(path, "/settings") || under(path, "/wrapped")) return "me"
  return null
}
