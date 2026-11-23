"use client"

import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { archiveHabit, restoreHabit } from "@/app/actions/habits"
import { Button } from "@/components/ui/button"
import type { Habit } from "@/lib/data"

import { HabitFormDialog } from "../../dashboard/habit-form-dialog"

export function HabitActions({ habit, archived }: { habit: Habit; archived: boolean }) {
  const [editOpen, setEditOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const toggleArchive = () =>
    startTransition(async () => {
      const res = archived ? await restoreHabit(habit.id) : await archiveHabit(habit.id)
      if (res.ok) toast.success(archived ? "Habit restored" : "Habit archived")
      else toast.error(res.error)
    })

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <PencilIcon /> Edit
      </Button>
      <Button variant="outline" size="sm" disabled={pending} onClick={toggleArchive}>
        {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
        {archived ? "Restore" : "Archive"}
      </Button>
      <HabitFormDialog open={editOpen} onOpenChange={setEditOpen} habit={habit} />
    </div>
  )
}
