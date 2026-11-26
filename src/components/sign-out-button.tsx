"use client"

import { LogOutIcon } from "lucide-react"
import { useTransition } from "react"

import { signOut } from "@/app/actions/auth"
import { clearOfflinePages } from "@/components/sw-register"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"

/** Sign out: drop the pages cached for offline use first (they hold this person's data). */
export async function signOutEverywhere() {
  await clearOfflinePages()
  await signOut()
}

export function SignOutButton() {
  const { t } = useI18n()
  const [pending, start] = useTransition()
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(signOutEverywhere)}>
      <LogOutIcon aria-hidden /> {t.nav.signOut}
    </Button>
  )
}
