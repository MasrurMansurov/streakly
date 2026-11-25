import { createHash } from "node:crypto"

/**
 * Leaked-password check against the HaveIBeenPwned "Pwned Passwords" range API
 * (k-anonymity: only the first 5 hex chars of the SHA-1 leave the server).
 * Supabase's built-in check is Pro-only, so sign-up does it here.
 */

/** How often `suffix` appears in a range response ("SUFFIX:COUNT" lines). */
export function countInRange(body: string, suffix: string): number {
  const want = suffix.toUpperCase()
  for (const line of body.split("\n")) {
    const [s, c] = line.trim().split(":")
    if (s?.toUpperCase() === want) return Number(c) || 0
  }
  return 0
}

/** Times the password was seen in breaches; `null` if the service couldn't be reached (fail open). */
export async function pwnedCount(password: string): Promise<number | null> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase()
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, {
      // padding hides the real size of the response
      headers: { "Add-Padding": "true", "User-Agent": "Streakly" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    })
    if (!res.ok) return null
    return countInRange(await res.text(), sha1.slice(5))
  } catch {
    return null
  }
}
