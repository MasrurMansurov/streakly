"use client"

import { HandshakeIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { invitePact } from "@/app/actions/pacts"
import { HabitPicker, type HabitChoice } from "@/components/habit-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/i18n/client"

export function PactInviteButton({
  inviteeId,
  name,
  habits,
  inPact,
}: {
  inviteeId: string
  name: string
  habits: HabitChoice[]
  inPact: boolean
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [habitId, setHabitId] = useState<string | null>(habits[0]?.id ?? null)
  const [pending, start] = useTransition()

  if (inPact) return <Badge variant="secondary">{t.pacts.inPact}</Badge>

  const send = () =>
    start(async () => {
      const res = await invitePact(inviteeId, habitId!)
      if (!res.ok) return void toast.error(res.error)
      toast.success(res.message)
      setOpen(false)
    })

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={t.pacts.inviteTitle(name)}>
        <HandshakeIcon /> {t.pacts.invite}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={send} disabled={pending || !habitId}>
              {t.pacts.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
