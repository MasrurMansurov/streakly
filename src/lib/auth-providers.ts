import { cacheLife } from "next/cache"

export type OAuthProvider = "google" | "github"
const KNOWN: OAuthProvider[] = ["google", "github"]

/**
 * OAuth providers that are switched on in Supabase (Auth → Providers).
 * Read from Supabase's public settings endpoint, so enabling Google in the
 * dashboard makes the button appear — no redeploy. Cached for a few minutes.
 */
export async function getEnabledProviders(): Promise<OAuthProvider[]> {
  "use cache"
  cacheLife("minutes")
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    })
    if (!res.ok) return []
    const { external } = (await res.json()) as { external?: Record<string, boolean> }
    return KNOWN.filter((p) => external?.[p])
  } catch {
    return []
  }
}
