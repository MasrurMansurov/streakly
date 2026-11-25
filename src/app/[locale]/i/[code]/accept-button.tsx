"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { acceptInvite } from "@/app/actions/invites"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"
import { localizePath } from "@/i18n"

/** Signed-in visitor: accept right here, then go to the Today screen. */
export function AcceptInviteButton({ code }: { code: string }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      size="lg"
      className="h-11 w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await acceptInvite(code)
          if (!res) return void toast.info(t.invite.own)
          toast.success(res.pact ? t.invite.acceptedPact(res.inviter) : t.invite.accepted(res.inviter), { duration: 8000 })
          router.push(localizePath(locale, "/dashboard"))
        })
      }
    >
      {t.invite.accept}
    </Button>
  )
}
