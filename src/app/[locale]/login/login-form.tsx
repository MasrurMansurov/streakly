"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { signIn, signUp } from "@/app/actions/auth"
import { IconTile } from "@/components/icon-tile"
import { MailCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { validationMessage } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { authSchema, type AuthInput } from "@/lib/validation"

import { OAuthButtons } from "./oauth-buttons"

type Mode = "signin" | "signup"


export function LoginForm() {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>("signin")
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<AuthInput>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = mode === "signin" ? await signIn(values) : await signUp(values)
      // on success the action redirects, so we only get here on error / "check email"
      if (!res.ok) toast.error(res.error)
      else if (res.message) setSentTo(values.email)
    })
  )

  if (sentTo) {
    return (
      <Card className="w-full max-w-sm items-center text-center">
        <CardHeader className="w-full">
          <IconTile icon={MailCheckIcon} size="lg" className="mx-auto" />
          <CardTitle>{t.auth.checkInbox}</CardTitle>
          <CardDescription>
            {t.auth.sentLink} <span className="font-medium text-foreground">{sentTo}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="link" onClick={() => setSentTo(null)}>
            {t.auth.backToSignIn}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{mode === "signin" ? t.auth.welcomeBack : t.auth.createAccount}</CardTitle>
        <CardDescription>
          {mode === "signin" ? t.auth.signInSubtitle : t.auth.signUpSubtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* only this notice reads the URL, so the form itself is in the static HTML */}
        <Suspense>
          <LinkErrorNotice />
        </Suspense>

        <OAuthButtons />

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="w-full">
            <TabsTrigger value="signin">{t.auth.tabSignIn}</TabsTrigger>
            <TabsTrigger value="signup">{t.auth.tabSignUp}</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t.auth.emailPlaceholder}
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{validationMessage(t, errors.email.message)}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            {errors.password && <p className="text-xs text-destructive">{validationMessage(t, errors.password.message)}</p>}
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? t.common.pleaseWait : mode === "signin" ? t.auth.submitSignIn : t.auth.submitSignUp}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/** Explains a failed email/OAuth link (?error=otp_expired etc.). */
function LinkErrorNotice() {
  const { t } = useI18n()
  const linkError = useSearchParams().get("error")
  if (!linkError) return null
  return (
    <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
      {t.auth.linkErrors[linkError as keyof typeof t.auth.linkErrors] ?? t.auth.linkErrors.default}
    </p>
  )
}
