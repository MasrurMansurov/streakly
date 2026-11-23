"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CopyIcon, ExternalLinkIcon } from "lucide-react"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { updateProfile } from "@/app/actions/profile"
import { Link } from "@/components/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { validationMessage } from "@/i18n"
import { useI18n } from "@/i18n/client"
import type { Profile } from "@/lib/data"
import { profileSchema, type ProfileInput } from "@/lib/validation"

export function ProfileForm({ profile }: { profile: Profile }) {
  const { locale, t } = useI18n()
  const [pending, startTransition] = useTransition()
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile.username,
      display_name: profile.display_name ?? "",
      bio: profile.bio ?? "",
      is_public: profile.is_public,
    },
  })
  const { errors, isDirty } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await updateProfile(values)
      if (res.ok) {
        toast.success(res.message ?? t.settings.saved)
        form.reset(values)
      } else {
        toast.error(res.error)
      }
    })
  )

  const publicPath = `/u/${profile.username}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/${locale}${publicPath}`)
    toast.success(t.settings.linkCopied)
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.profile}</CardTitle>
          <CardDescription>{t.settings.profileSub}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="username">{t.settings.username}</Label>
            <div className="flex items-center rounded-lg border focus-within:ring-3 focus-within:ring-ring/50">
              <span className="pl-2.5 text-sm text-muted-foreground">streakly/u/</span>
              <Input
                id="username"
                className="border-0 pl-0.5 focus-visible:ring-0"
                aria-invalid={!!errors.username}
                defaultValue={profile.username}
                {...form.register("username")}
              />
            </div>
            {errors.username && <p className="text-xs text-destructive">{validationMessage(t, errors.username.message)}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="display_name">{t.settings.displayName}</Label>
            <Input id="display_name" placeholder={t.settings.displayNamePlaceholder}
              defaultValue={profile.display_name ?? ""}
              {...form.register("display_name")} />
            {errors.display_name && <p className="text-xs text-destructive">{validationMessage(t, errors.display_name.message)}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bio">{t.settings.bio}</Label>
            <Textarea id="bio" rows={3} placeholder={t.settings.bioPlaceholder}
              defaultValue={profile.bio ?? ""}
              {...form.register("bio")} />
            {errors.bio && <p className="text-xs text-destructive">{validationMessage(t, errors.bio.message)}</p>}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="grid gap-1">
              <Label htmlFor="is_public">{t.settings.publicProfile}</Label>
              <p className="text-xs text-muted-foreground">
                {t.settings.publicProfileHint}
              </p>
            </div>
            <Controller
              control={form.control}
              name="is_public"
              render={({ field }) => (
                <Switch id="is_public" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {profile.is_public && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" render={<Link href={publicPath} />}>
                <ExternalLinkIcon /> {t.settings.viewPublic}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                <CopyIcon /> {t.settings.copyLink}
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending || !isDirty}>
            {pending ? t.common.saving : t.settings.saveChanges}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
