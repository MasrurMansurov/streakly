"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"
import { createClient } from "@/lib/supabase/client"

import type { OAuthProvider as Provider } from "@/lib/auth-providers"

const PROVIDERS: Record<Provider, { label: string; icon: React.ReactNode }> = {
  github: {
    label: "GitHub",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="fill-current">
        <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
      </svg>
    ),
  },
  google: {
    label: "Google",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
        <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
      </svg>
    ),
  },
}

/** "Continue with Google / GitHub" — only for providers enabled in Supabase. */
export function OAuthButtons({ providers }: { providers: Provider[] }) {
  const [pending, setPending] = useState<Provider | null>(null)
  const { locale, t } = useI18n()
  if (providers.length === 0) return null

  const signIn = async (provider: Provider) => {
    setPending(provider)
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/dashboard`,
        // let people pick which Google account to use
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    })
    if (error) {
      toast.error(error.message)
      setPending(null)
    }
    // on success the browser is redirected to the provider
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        {providers.map((p) => (
          <Button key={p} type="button" variant="outline" disabled={pending !== null} onClick={() => signIn(p)}>
            {PROVIDERS[p].icon}
            {pending === p ? t.auth.redirecting : t.auth.continueWith(PROVIDERS[p].label)}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.auth.orWithEmail}
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
