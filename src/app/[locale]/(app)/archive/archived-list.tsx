"use client"

import { ArchiveIcon, ArchiveRestoreIcon, Trash2Icon } from "lucide-react"
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
import { IconTile } from "@/components/icon-tile"
import { Link } from "@/components/link"
import { formatDay } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { habitColor } from "@/lib/habit-colors"
import { cn } from "@/lib/utils"

export function ArchivedList({ habits }: { habits: ArchivedHabit[] }) {
  const { locale, t } = useI18n()
  const [pending, startTransition] = useTransition()
  const [toDelete, setToDelete] = useState<ArchivedHabit | null>(null)

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const res = await action()
      if (res.ok) toast.success(success)
      else toast.error(res.error ?? t.common.somethingWrong)
    })

  if (habits.length === 0) {
    return (
      <Card className="items-center border-dashed py-12 text-center">
        <IconTile icon={ArchiveIcon} tone="muted" size="lg" />
        <div className="grid gap-1">
          <h2 className="font-medium">{t.archive.emptyTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.archive.emptyText}</p>
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
                  {t.archive.meta(
                    h.checkIns,
                    formatDay(locale, h.archived_at.slice(0, 10), { month: "short", day: "numeric", year: "numeric" })
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => run(() => restoreHabit(h.id), t.habit.restoredToast(h.name))}
              >
                <ArchiveRestoreIcon /> {t.common.restore}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.archive.deleteAria(h.name)}
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
            <DialogTitle>{t.archive.deleteTitle(toDelete?.name ?? "")}</DialogTitle>
            <DialogDescription>{t.archive.deleteText(toDelete?.checkIns ?? 0)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const h = toDelete!
                setToDelete(null)
                run(() => deleteHabit(h.id), t.habit.deleted)
              }}
            >
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
