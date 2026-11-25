/**
 * Where a visitor came from (growth plan 1.1), decided once on the first visit:
 * an explicit ?utm_source= / ?ref= wins, otherwise the external referrer's
 * site. Own-site navigation and direct visits give null (stored as "direct").
 */
/** First-touch attribution cookie (90 days), set on the first visit, consumed at sign-up. */
export const ATTRIBUTION_COOKIE = "st_attr"

export type Attribution = { source: string; ref?: string; landing: string }

/** Known referrers → short source names (so "habr.com" and "m.habr.com" count together). */
const KNOWN: [RegExp, string][] = [
  [/(^|\.)habr\.com$/, "habr"],
  [/(^|\.)(t\.me|telegram\.org|telegram\.me)$/, "telegram"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/^news\.ycombinator\.com$/, "hn"],
  [/(^|\.)producthunt\.com$/, "producthunt"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"],
  [/(^|\.)github\.com$/, "github"],
  [/(^|\.)vc\.ru$/, "vc"],
  [/(^|\.)dzen\.ru$/, "dzen"],
  [/(^|\.)alternativeto\.net$/, "alternativeto"],
  [/(^|\.)(google\.[a-z.]+)$/, "google"],
  [/(^|\.)(yandex\.[a-z.]+|ya\.ru)$/, "yandex"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)(instagram\.com|l\.instagram\.com)$/, "instagram"],
  [/(^|\.)(facebook\.com|l\.facebook\.com)$/, "facebook"],
  [/(^|\.)(tiktok\.com)$/, "tiktok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)(vk\.com|vk\.ru)$/, "vk"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
]

/** Lower-case, only [a-z0-9._-], at most 64 chars; empty → undefined. */
export function cleanTag(value: string | null | undefined): string | undefined {
  const v = (value ?? "").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64)
  return v || undefined
}

export function attributionFrom({ search, referrer, host, path }: { search: string; referrer: string; host: string; path: string }): Attribution | null {
  const params = new URLSearchParams(search)
  const landing = path.slice(0, 200)
  const utm = cleanTag(params.get("utm_source"))
  const ref = cleanTag(params.get("ref"))
  if (utm) return { source: utm, ...(ref ? { ref } : {}), landing }
  if (ref) return { source: "ref", ref, landing }
  if (!referrer) return null
  let from: string
  try {
    from = new URL(referrer).hostname.toLowerCase()
  } catch {
    return null
  }
  if (!from || from === host.toLowerCase()) return null
  const known = KNOWN.find(([re]) => re.test(from))
  return { source: known ? known[1] : cleanTag(from.replace(/^www\./, "")) ?? "other", landing }
}
