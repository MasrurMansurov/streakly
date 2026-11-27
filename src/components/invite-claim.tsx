"use client"

import { useEffect } from "react"
import { toast } from "sonner"

import { acceptInvite } from "@/app/actions/invites"
import { useI18n } from "@/i18n/client"
import { INVITE_COOKIE, inviteAcceptedMessage } from "@/lib/invite"

/** Signed-in pages: apply an invite the visitor opened before signing up (cookie from the invite page). */
export function InviteClaim() {
  const { t } = useI18n()
  useEffect(() => {
    if (!document.cookie.split("; ").some((c) => c.startsWith(`${INVITE_COOKIE}=`))) return
    void acceptInvite()
      .then((res) => {
        if (res) toast.success(inviteAcceptedMessage(t.invite, res), { duration: 8000 })
      })
      .catch(() => {})
  }, [t])
  return null
}
