"use client"

import { PencilIcon, PlusIcon, StickyNoteIcon } from "lucide-react"
import { useState } from "react"

import { NoteDialog } from "@/components/note-dialog"
import { Button } from "@/components/ui/button"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"

type Props = {
  habitId: string
  habitName: string
  /** recent check-in dates, newest first */
  dates: string[]
  notes: Record<string, string>
}

export function NotesList({ habitId, habitName, dates, notes }: Props) {
  const { locale, t } = useI18n()
  const [editing, setEditing] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  if (dates.length === 0) return <p className="text-sm text-muted-foreground">{t.notes.empty}</p>

  // days with a note always show; of the rest, only the last week (to add one)
  const visible = showAll ? dates : dates.filter((d, i) => notes[d] || i < 7)
  const hidden = dates.length - visible.length

  return (
    <>
      <ul className="divide-y">
        {visible.map((date) => {
          const note = notes[date]
          return (
            <li key={date} className="flex items-start gap-3 py-2.5">
              <span className="w-24 shrink-0 pt-1 text-sm text-muted-foreground tabular-nums">
                {formatDay(locale, date, { weekday: "short", month: "short", day: "numeric" })}
              </span>
              {note ? (
                <p className="min-w-0 flex-1 pt-1 text-sm break-words whitespace-pre-wrap">
                  <StickyNoteIcon className="mr-1.5 inline size-3.5 text-muted-foreground" />
                  {note}
                </p>
              ) : (
                <span className="flex-1" />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground"
                aria-label={note ? t.notes.edit : t.notes.add}
                onClick={() => setEditing(date)}
              >
                {note ? <PencilIcon /> : <PlusIcon />}
                {!note && <span className="hidden sm:inline">{t.notes.add}</span>}
              </Button>
            </li>
          )
        })}
      </ul>
      {hidden > 0 && (
        <Button variant="ghost" size="sm" className="mt-1 text-muted-foreground" onClick={() => setShowAll(true)}>
          {t.notes.showAll(hidden)}
        </Button>
      )}

      {editing && (
        <NoteDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          habitId={habitId}
          habitName={habitName}
          date={editing}
          initialNote={notes[editing] ?? ""}
        />
      )}
    </>
  )
}
