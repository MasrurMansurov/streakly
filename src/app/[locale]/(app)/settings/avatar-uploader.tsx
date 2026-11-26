"use client"

import { Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { updateAvatar } from "@/app/actions/profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"
import { createClient } from "@/lib/supabase/client"
import { initials } from "@/lib/initials"

const MAX_BYTES = 2 * 1024 * 1024
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

type Props = { userId: string; avatarUrl: string | null; name: string }

export function AvatarUploader({ userId, avatarUrl, name }: Props) {
  const { t } = useI18n()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(avatarUrl)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const busy = uploading || pending

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!TYPES.includes(file.type)) return void toast.error(t.settings.photoTypeError)
    if (file.size > MAX_BYTES) return void toast.error(t.settings.photoSizeError)

    setUploading(true)
    const ext = file.type.split("/")[1].replace("jpeg", "jpg")
    // new name every time, so browsers and CDNs never show a cached old picture
    const path = `${userId}/avatar-${Date.now()}.${ext}`
    const supabase = createClient()
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
    })
    if (error) {
      setUploading(false)
      return void toast.error(error.message)
    }

    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl
    setUploading(false)
    startTransition(async () => {
      const res = await updateAvatar(url)
      if (res.ok) {
        setPreview(url)
        toast.success(res.message ?? t.settings.avatarUpdated)
      } else toast.error(res.error)
    })
  }

  const remove = () =>
    startTransition(async () => {
      const res = await updateAvatar(null)
      if (res.ok) {
        setPreview(null)
        toast.success(res.message ?? t.settings.avatarRemoved)
      } else toast.error(res.error)
    })

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {preview && <AvatarImage src={preview} alt="" />}
        <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
            {preview ? t.settings.change : t.settings.upload}
          </Button>
          {preview && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={remove}>
              <Trash2Icon /> {t.settings.remove}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t.settings.photoHint}</p>
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="sr-only"
        aria-label={t.settings.photoInputLabel}
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = "" // allow picking the same file again
        }}
      />
    </div>
  )
}
