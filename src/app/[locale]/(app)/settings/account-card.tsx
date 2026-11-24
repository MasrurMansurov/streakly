"use client"

import { DownloadIcon, Trash2Icon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteMyAccount, exportMyData } from "@/app/actions/account"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { localizePath } from "@/i18n"
import { useI18n } from "@/i18n/client"

export function AccountCard({ username }: { username: string }) {
  const { t, locale } = useI18n()
  const [exporting, startExport] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState("")

  const download = () =>
    startExport(async () => {
      const res = await exportMyData()
      if (!res.ok) return void toast.error(res.error)
      const url = URL.createObjectURL(new Blob([res.csv], { type: "text/csv;charset=utf-8" }))
      const a = Object.assign(document.createElement("a"), { href: url, download: res.filename })
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t.account.exported)
    })

  const remove = () =>
    startDelete(async () => {
      const res = await deleteMyAccount(confirm)
      if (!res.ok) return void toast.error(res.error)
      window.location.assign(localizePath(locale, "/")) // full reload: drop all signed-in state

    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.account.dataTitle}</CardTitle>
        <CardDescription>{t.account.dataSub}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Button variant="outline" className="w-fit" onClick={download} disabled={exporting}>
          <DownloadIcon /> {t.account.export}
        </Button>
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-0.5">
            <span className="text-sm font-medium">{t.account.deleteTitle}</span>
            <span className="max-w-sm text-xs text-muted-foreground">{t.account.deleteSub}</span>
          </div>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            <Trash2Icon /> {t.account.deleteButton}
          </Button>
        </div>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setConfirm("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.account.confirmTitle}</DialogTitle>
            <DialogDescription>{t.account.confirmText(username)}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              remove()
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="confirm-username">{t.account.confirmLabel}</Label>
              <Input
                id="confirm-username"
                autoComplete="off"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleting || confirm.trim().toLowerCase() !== username}
              >
                {t.account.confirmButton}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
