"use client"

import { CopyIcon, SendIcon, UserPlusIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { track } from "@/app/actions/analytics"
import { getInviteCode } from "@/app/actions/invites"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { localizePath } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { habitColor } from "@/lib/habit-colors"
import { cn } from "@/lib/utils"

type HabitChoice = { id: string; name: string; color: string }

/** "Invite a friend": a link for people without an account, optionally with a pact habit. */
export function InviteDialog({ habits, trigger }: { habits: HabitChoice[]; trigger?: (open: () => void) => React.ReactNode }) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [habitId, setHabitId] = useState<string | null>(habits[0]?.id ?? null)
  const [pending, start] = useTransition()

  const link = async () => {
    const res = await getInviteCode(habitId)
    if (!res.ok) throw new Error(res.error)
    return `${window.location.origin}${localizePath(locale, `/i/${res.code}`)}`
  }

  const send = () =>
    start(async () => {
      try {
        const url = await link()
        if (navigator.share) {
          await navigator.share({ title: "Streakly", text: t.invite.shareText, url })
          void track("invite_link_copied", { how: "share", habit: Boolean(habitId) }).catch(() => {})
        } else {
          await navigator.clipboard.writeText(url)
          toast.success(t.invite.copied)
          void track("invite_link_copied", { how: "copy", habit: Boolean(habitId) }).catch(() => {})
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast.error((e as Error).message || t.common.somethingWrong)
      }
    })

  const copy = () =>
    start(async () => {
      try {
        await navigator.clipboard.writeText(await link())
        toast.success(t.invite.copied)
        void track("invite_link_copied", { how: "copy", habit: Boolean(habitId) }).catch(() => {})
      } catch (e) {
        toast.error((e as Error).message || t.common.somethingWrong)
      }
    })

  const openDialog = () => setOpen(true)
  return (
    <>
      {trigger ? (
        trigger(openDialog)
      ) : (
        <Button variant="outline" onClick={openDialog}>
          <UserPlusIcon aria-hidden /> {t.invite.button}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.invite.dialogTitle}</DialogTitle>
            <DialogDescription>{t.invite.dialogText}</DialogDescription>
          </DialogHeader>
          {habits.length > 0 && (
            <div className="grid gap-2">
              <Label id="invite-habit">{t.invite.habitLabel}</Label>
              <div role="radiogroup" aria-labelledby="invite-habit" className="flex flex-wrap gap-1.5">
                {[{ id: null, name: t.invite.noHabitOption, color: "" }, ...habits].map((h) => (
                  <button
                    key={h.id ?? "none"}
                    type="button"
                    role="radio"
                    aria-checked={habitId === h.id}
                    onClick={() => setHabitId(h.id)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition",
                      habitId === h.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    {h.color && <span className={cn("size-2 rounded-full", habitColor(h.color).dot)} aria-hidden />}
                    {h.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={send}>
              <SendIcon aria-hidden /> {t.invite.send}
            </Button>
            <Button variant="outline" disabled={pending} onClick={copy}>
              <CopyIcon aria-hidden /> {t.invite.copy}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
