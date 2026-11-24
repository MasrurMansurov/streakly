"use client"

import { CopyIcon, DownloadIcon, Share2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useI18n } from "@/i18n/client"
import { SHARE_PERIODS, type SharePeriod } from "@/lib/share"
import { cn } from "@/lib/utils"

/** "Share your progress": a PNG card (week / month / year) + Wordle-style text. */
export function ShareDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, locale } = useI18n()
  const [period, setPeriod] = useState<SharePeriod>("week")
  const [loaded, setLoaded] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const src = `/api/share-card?period=${period}&locale=${locale}`
  const filename = `streakly-${period}.png`

  const imageFile = async () => {
    const res = await fetch(src)
    if (!res.ok) throw new Error(String(res.status))
    return new File([await res.blob()], filename, { type: "image/png" })
  }
  const text = async () => (await fetch(`${src}&format=text`)).text()

  const share = async () => {
    setBusy(true)
    try {
      const [file, caption] = await Promise.all([imageFile(), text()])
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption })
      } else {
        download(file)
      }
    } catch (e) {
      // closing the share sheet is not an error
      if ((e as Error).name !== "AbortError") toast.error(t.common.somethingWrong)
    } finally {
      setBusy(false)
    }
  }

  const download = (file: File) => {
    const url = URL.createObjectURL(file)
    Object.assign(document.createElement("a"), { href: url, download: filename }).click()
    URL.revokeObjectURL(url)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(await text())
      toast.success(t.share.copied)
    } catch {
      toast.error(t.common.somethingWrong)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.share.title}</DialogTitle>
          <DialogDescription>{t.share.description}</DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label={t.share.title} className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {SHARE_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md py-1.5 text-sm font-medium transition",
                period === p ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.share.periods[p]}
            </button>
          ))}
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-muted">
          {loaded !== src && <Skeleton className="absolute inset-0 rounded-none" />}
          {/* eslint-disable-next-line @next/next/no-img-element -- generated per user, not optimizable */}
          <img
            key={src}
            src={src}
            alt={t.share.alt(t.share.periods[period])}
            className={cn("size-full object-cover transition-opacity", loaded === src ? "opacity-100" : "opacity-0")}
            onLoad={() => setLoaded(src)}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button onClick={share} disabled={busy}>
            <Share2Icon /> {t.share.share}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => imageFile().then(download, () => toast.error(t.common.somethingWrong))}>
            <DownloadIcon /> {t.share.download}
          </Button>
          <Button variant="outline" onClick={copy}>
            <CopyIcon /> {t.share.copy}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
