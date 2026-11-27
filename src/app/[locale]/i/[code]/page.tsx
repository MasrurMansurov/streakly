import type { Metadata } from "next"
import { FlameIcon } from "lucide-react"
import { connection } from "next/server"
import { Suspense } from "react"

import { InviteCapture } from "@/components/invite-capture"
import { Link } from "@/components/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getT } from "@/i18n/server"
import { getCurrentUser } from "@/lib/data"
import { habitColor } from "@/lib/habit-colors"
import { isInviteCode } from "@/lib/invite"
import { createPublicClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

import { AcceptInviteButton } from "./accept-button"
import { initials } from "@/lib/initials"

type Props = { params: Promise<{ code: string }> }

async function preview(code: string) {
  if (!isInviteCode(code)) return null
  await connection()
  const { data } = await createPublicClient().rpc("invite_preview", { p_code: code })
  return data?.[0] ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const [invite, { t }] = await Promise.all([preview(code), getT()])
  if (!invite) return { title: t.invite.notFoundTitle, robots: { index: false } }
  return {
    title: t.invite.title(invite.inviter_name),
    description: invite.habit_name ? t.invite.withHabit(invite.habit_name) : t.invite.noHabit,
    robots: { index: false }, // personal links stay out of search
  }
}

export default function InvitePage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
          <Invite params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}

async function Invite({ params }: Props) {
  const { code } = await params
  const [invite, user, { t }] = await Promise.all([preview(code), getCurrentUser(), getT()])
  if (!invite) {
    return (
      <Card className="items-center gap-2 p-8 text-center">
        <h1 className="text-lg font-semibold">{t.invite.notFoundTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.invite.notFound}</p>
      </Card>
    )
  }
  const color = invite.habit_color ? habitColor(invite.habit_color) : null
  return (
    <Card className="items-center gap-5 p-8 text-center">
      {!user && <InviteCapture code={code} />}
      <Avatar className="size-16">
        {invite.inviter_avatar && <AvatarImage src={invite.inviter_avatar} alt="" />}
        <AvatarFallback className="text-lg">{initials(invite.inviter_name)}</AvatarFallback>
      </Avatar>
      <div className="grid gap-2">
        <h1 className="text-xl font-semibold text-balance">{t.invite.title(invite.inviter_name)}</h1>
        <p className="text-sm text-muted-foreground text-balance">
          {invite.habit_name ? t.invite.withHabit(invite.habit_name) : t.invite.noHabit}
        </p>
      </div>
      {invite.habit_name && color && (
        <div className="flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left">
          <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", color.dot)} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium break-words">{invite.habit_name}</span>
            {invite.habit_checkins_30 !== null && (
              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <FlameIcon className="size-3.5 text-streak" aria-hidden /> {t.invite.recent(invite.habit_checkins_30)}
              </span>
            )}
          </span>
        </div>
      )}
      {user ? (
        <AcceptInviteButton code={code} />
      ) : (
        <div className="grid w-full gap-3">
          <Button size="lg" className="h-11 w-full" render={<Link href={`/login?signup=1&ref=${code}`} />}>
            {t.invite.accept}
          </Button>
          <Link href={`/login?ref=${code}`} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {t.invite.haveAccount}
          </Link>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t.invite.free}</p>
    </Card>
  )
}
