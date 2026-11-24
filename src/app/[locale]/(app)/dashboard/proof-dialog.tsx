"use client"

import { CameraIcon, Trash2Icon } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteProof, saveProof } from "@/app/actions/proofs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/client"
import type { PactProof } from "@/lib/pacts"

/** Downscale to ≤1080px JPEG in the browser (fast uploads, small storage). */
async function compress(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1080 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.8)
  )
  return new File([blob], "proof.jpg", { type: "image/jpeg" })
}

export function ProofDialog({
  open,
  onOpenChange,
  pactId,
  current,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pactId: string
  current: PactProof | null
}) {
  const { t } = useI18n()
  const [note, setNote] = useState(current?.note ?? "")
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(current?.photoUrl ?? null)
  const [pending, start] = useTransition()
  const input = useRef<HTMLInputElement>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    try {
      const small = await compress(file)
      setPhoto(small)
      setPreview(URL.createObjectURL(small))
    } catch {
      toast.error(t.proof.badPhoto)
    }
  }

  const submit = () =>
    start(async () => {
      const form = new FormData()
      form.set("pactId", pactId)
      form.set("note", note)
      if (photo) form.set("photo", photo)
      const res = await saveProof(form)
      if (!res.ok) return void toast.error(res.error)
      toast.success(res.message)
      onOpenChange(false)
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.proof.title}</DialogTitle>
          <DialogDescription>{t.proof.text}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t.proof.photo}</Label>
            <input
              ref={input}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label={t.proof.choosePhoto}
              onChange={(e) => pick(e.target.files?.[0])}
            />
            {preview ? (
              <button type="button" onClick={() => input.current?.click()} className="overflow-hidden rounded-xl border">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview / signed URL */}
                <img src={preview} alt="" className="max-h-72 w-full object-cover" />
              </button>
            ) : (
              <Button type="button" variant="outline" className="h-24 border-dashed" onClick={() => input.current?.click()}>
                <CameraIcon /> {t.proof.choosePhoto}
              </Button>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="proof-note">{t.proof.note}</Label>
            <Textarea id="proof-note" rows={2} maxLength={140} value={note} placeholder={t.proof.notePlaceholder} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          {current && (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-muted-foreground"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteProof(pactId)
                  onOpenChange(false)
                })
              }
            >
              <Trash2Icon /> {t.proof.remove}
            </Button>
          )}
          <Button onClick={submit} disabled={pending || (!photo && !note.trim() && !current?.photoUrl)}>
            {t.proof.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
