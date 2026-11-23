"use client"

import { ArchiveIcon, ArchiveRestoreIcon, Trash2Icon } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteHabit, restoreHabit } from "@/app/actions/habits"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ArchivedHabit } from "@/lib/data"
import { formatDate } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { cn } from "@/lib/utils"

export function ArchivedList({ habits }: { habits: ArchivedHabit[] }) {
  const [pending, startTransition] = useTransition()
  const [toDelete, setToDelete] = useState<ArchivedHabit | null>(null)

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const res = await action()
      if (res.ok) toast.success(success)
      else toast.error(res.error ?? "Something went wrong")
    })

  if (habits.length === 0) {
    return (
      <Card className="items-center border-dashed py-12 text-center">
        <ArchiveIcon className="size-8 text-muted-foreground" />
        <div className="grid gap-1">
          <h2 className="font-medium">Nothing archived</h2>
          <p className="text-sm text-muted-foreground">Habits you archive from the dashboard will show up here.</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <ul className="grid gap-2">
        {habits.map((h) => (
          <li key={h.id}>
            <Card className="flex-row items-center gap-3 p-4">
              <span className={cn("size-2.5 shrink-0 rounded-full", habitColor(h.color).dot)} />
              <div className="min-w-0 flex-1">
                <Link href={`/habits/${h.id}`} className="block truncate font-medium hover:underline">
                  {h.name}
                </Link>
                <div className="truncate text-sm text-muted-foreground">
                  {h.checkIns} check-in{h.checkIns === 1 ? "" : "s"} · archived{" "}
                  {formatDate(h.archived_at.slice(0, 10), { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => run(() => restoreHabit(h.id), `“${h.name}” restored`)}
              >
                <ArchiveRestoreIcon /> Restore
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete “${h.name}”`}
                disabled={pending}
                onClick={() => setToDelete(h)}
              >
                <Trash2Icon />
              </Button>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{toDelete?.name}”?</DialogTitle>
            <DialogDescription>This permanently removes the habit and all {toDelete?.checkIns} check-ins.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const h = toDelete!
                setToDelete(null)
                run(() => deleteHabit(h.id), "Habit deleted")
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
