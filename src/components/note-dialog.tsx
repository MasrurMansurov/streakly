"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { saveNote } from "@/app/actions/habits"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  habitId: string
  habitName: string
  date: string
  initialNote?: string
  /** called with the saved text ("" when removed) */
  onSaved?: (note: string) => void
}

/** Add or edit the private note on one check-in. Saving an empty note removes it. */
export function NoteDialog({ open, onOpenChange, habitId, habitName, date, initialNote = "", onSaved }: Props) {
  const { locale, t } = useI18n()
  const [note, setNote] = useState(initialNote)
  const [pending, startTransition] = useTransition()

  const submit = () =>
    startTransition(async () => {
      const res = await saveNote(habitId, date, note)
      if (!res.ok) return void toast.error(res.error)
      toast.success(res.message)
      onSaved?.(note.trim())
      onOpenChange(false)
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setNote(initialNote) // reset to the saved text every time it opens
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.notes.dialogTitle(habitName)}</DialogTitle>
            <DialogDescription>
              {formatDay(locale, date, { weekday: "long", month: "long", day: "numeric" })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1">
            <Textarea
              autoFocus
              rows={3}
              maxLength={280}
              value={note}
              placeholder={t.notes.placeholder}
              aria-label={t.notes.title}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit()
              }}
            />
            <span className="justify-self-end text-xs text-muted-foreground tabular-nums">
              {t.notes.counter(note.length)}
            </span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending || note.trim() === initialNote.trim()}>
              {pending ? t.common.saving : t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
