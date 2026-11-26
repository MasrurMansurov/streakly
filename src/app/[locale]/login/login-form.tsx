"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { signIn, signUp } from "@/app/actions/auth"
import { IconTile } from "@/components/icon-tile"
import { Link } from "@/components/link"
import { Notice } from "@/components/notice"
import { CircleAlertIcon, MailCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { validationMessage } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { authSchema, type AuthInput } from "@/lib/validation"

import type { OAuthProvider } from "@/lib/auth-providers"

import { OAuthButtons } from "./oauth-buttons"

type Mode = "signin" | "signup"


export function LoginForm({ providers }: { providers: OAuthProvider[] }) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>("signin")
  const [sentTo, setSentTo] = useState<string | null>(null)
  // invite links send new people here with ?signup=1 (read in the browser: the page stays static)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get("signup") === "1") setMode("signup")
  }, [])
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

        <OAuthButtons providers={providers} />

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
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {t.legal.agree}{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
            {t.legal.termsLink}
          </Link>{" "}
          {t.legal.and}{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            {t.legal.privacyLink}
          </Link>
          .
        </p>
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
    <Notice role="alert" icon={CircleAlertIcon} tone="warning" title={t.auth.linkErrors[linkError as keyof typeof t.auth.linkErrors] ?? t.auth.linkErrors.default} />
  )
}
