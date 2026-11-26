"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { convertGuest } from "@/app/actions/demo"
import { acceptInvite } from "@/app/actions/invites"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { validationMessage } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { authSchema } from "@/lib/validation"

const schema = authSchema.extend({ keepSamples: z.boolean() })
type Values = z.infer<typeof schema>

/** Shown to demo guests on every app page: the data is temporary — save it as an account. */
export function GuestBanner() {
  const { t } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", keepSamples: false } })
  const { errors } = form.formState
  const keepSamples = useWatch({ control: form.control, name: "keepSamples" })

  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      const res = await convertGuest(values)
      if (!res.ok) return void toast.error(res.error)
      toast.success(res.message, { duration: 8000 })
      setOpen(false)
      // an invite opened before the demo applies now that there's an account
      const invite = await acceptInvite().catch(() => null)
      if (invite) toast.success(invite.pact ? t.invite.acceptedPact(invite.inviter) : t.invite.accepted(invite.inviter), { duration: 8000 })
      router.refresh()
    })
  )

  return (
    <>
      <div role="status" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <p className="min-w-48 flex-1">
          <span className="font-medium">{t.demo.banner}</span> <span className="text-muted-foreground">{t.demo.bannerHint}</span>
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          {t.demo.save}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.demo.dialogTitle}</DialogTitle>
            <DialogDescription>{t.demo.dialogText}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="guest-email">{t.auth.email}</Label>
              <Input id="guest-email" type="email" autoComplete="email" placeholder={t.auth.emailPlaceholder} aria-invalid={!!errors.email} {...form.register("email")} />
              {errors.email && <p className="text-xs text-destructive">{validationMessage(t, errors.email.message)}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guest-password">{t.auth.password}</Label>
              <Input id="guest-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
              {errors.password && <p className="text-xs text-destructive">{validationMessage(t, errors.password.message)}</p>}
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-0.5">
                <Label htmlFor="guest-keep">{t.demo.keepSamples}</Label>
                <p className="text-xs text-muted-foreground">{t.demo.keepSamplesHint}</p>
              </div>
              <Switch id="guest-keep" checked={keepSamples} onCheckedChange={(v) => form.setValue("keepSamples", v)} />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? t.common.pleaseWait : t.demo.submit}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
