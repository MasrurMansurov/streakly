"use client"

import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { archiveHabit, restoreHabit } from "@/app/actions/habits"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"
import type { Habit } from "@/lib/data"

import { HabitFormDialog } from "../../dashboard/habit-form-dialog"

export function HabitActions({ habit, archived }: { habit: Habit; archived: boolean }) {
  const { t } = useI18n()
  const [editOpen, setEditOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const toggleArchive = () =>
    startTransition(async () => {
      const res = archived ? await restoreHabit(habit.id) : await archiveHabit(habit.id)
      if (res.ok) toast.success(archived ? t.habit.restored : t.habit.archived)
      else toast.error(res.error)
    })

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <PencilIcon /> {t.common.edit}
      </Button>
      <Button variant="outline" size="sm" disabled={pending} onClick={toggleArchive}>
        {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
        {archived ? t.common.restore : t.common.archive}
      </Button>
      <HabitFormDialog open={editOpen} onOpenChange={setEditOpen} habit={habit} />
    </div>
  )
}
