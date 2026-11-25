"use client"

import { UserPlusIcon, XIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

import { InviteDialog } from "@/components/invite-dialog"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"

const KEY = "streakly:invite-prompt-hidden-until"
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn))
const hiddenNow = () => {
  try {
    return Number(localStorage.getItem(KEY) ?? 0) > Date.now()
  } catch {
    return false
  }
}

/**
 * Asked at the moment that works best (a check-in just made, no pact yet):
 * invite a friend into a shared streak. Hidden for 14 days on dismiss.
 */
export function InvitePrompt({ habits }: { habits: { id: string; name: string; color: string }[] }) {
  const { t } = useI18n()
  const hidden = useSyncExternalStore(subscribe, hiddenNow, () => true)
  if (hidden) return null
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now() + 14 * 86_400_000))
    } catch {}
    listeners.forEach((fn) => fn())
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
      <UserPlusIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">{t.invite.prompt}</span>
      <InviteDialog
        habits={habits}
        trigger={(open) => (
          <Button size="sm" onClick={open}>
            {t.invite.promptCta}
          </Button>
        )}
      />
      <Button variant="ghost" size="icon-sm" aria-label={t.invite.dismiss} onClick={dismiss}>
        <XIcon aria-hidden />
      </Button>
    </div>
  )
}
