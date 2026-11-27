"use client"

import { BellRingIcon, HandshakeIcon, MoreHorizontalIcon, UserMinusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { sendNudge } from "@/app/actions/cheers"
import { setFollowing } from "@/app/actions/follows"
import { invitePact } from "@/app/actions/pacts"
import { HabitPicker, type HabitChoice } from "@/components/habit-picker"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useI18n } from "@/i18n/client"

type Props = {
  profileId: string
  name: string
  habits: HabitChoice[]
  inPact: boolean
  /** no check-in from them today and no nudge from you yet */
  canNudge: boolean
}

/**
 * The actions for one person you follow — a quiet "…" instead of buttons
 * repeated on every row: nudge (if they haven't checked in today), start a pact
 * (unless you're in one), unfollow.
 */
export function PersonMenu({ profileId, name, habits, inPact, canNudge }: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const [pactOpen, setPactOpen] = useState(false)
  const [habitId, setHabitId] = useState<string | null>(habits[0]?.id ?? null)
  const [pending, start] = useTransition()

  const sendPact = () =>
    start(async () => {
      const res = await invitePact(profileId, habitId!)
      if (!res.ok) return void toast.error(res.error)
      toast.success(res.message)
      setPactOpen(false)
    })

  const nudge = () =>
    start(async () => {
      const res = await sendNudge(profileId, name)
      if (!res.ok) return void toast.error(res.error)
      if (res.message) toast.success(res.message)
    })

  const unfollow = () =>
    start(async () => {
      const res = await setFollowing(profileId, false)
      if (!res.ok) return void toast.error(res.error)
      toast.success(t.friends.unfollowed(name))
      router.refresh()
    })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t.friends.personActions(name)} disabled={pending} />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canNudge && (
            <DropdownMenuItem onClick={nudge}>
              <BellRingIcon /> {t.cheers.nudge(name)}
            </DropdownMenuItem>
          )}
          {!inPact && (
            <DropdownMenuItem onClick={() => setPactOpen(true)}>
              <HandshakeIcon /> {t.pacts.inviteTitle(name)}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={unfollow}>
            <UserMinusIcon /> {t.friends.unfollow}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* outside the menu: the menu closes before the dialog opens */}
      <Dialog open={pactOpen} onOpenChange={setPactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.pacts.inviteTitle(name)}</DialogTitle>
            <DialogDescription>{t.pacts.inviteText}</DialogDescription>
          </DialogHeader>
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.pacts.noHabits}</p>
          ) : (
            <HabitPicker habits={habits} value={habitId} onChange={setHabitId} label={t.pacts.yourHabit} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPactOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={sendPact} disabled={pending || !habitId}>
              {t.pacts.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
