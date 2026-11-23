"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { MailCheckIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { signIn, signUp } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authSchema, type AuthInput } from "@/lib/validation"

type Mode = "signin" | "signup"

export function LoginForm() {
  const params = useSearchParams()
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
          <MailCheckIcon className="mx-auto size-8 text-emerald-500" />
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            We sent a confirmation link to <span className="font-medium text-foreground">{sentTo}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="link" onClick={() => setSentTo(null)}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{mode === "signin" ? "Welcome back" : "Create your account"}</CardTitle>
        <CardDescription>
          {mode === "signin" ? "Sign in to keep your streaks going." : "Start tracking habits in seconds."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {params.get("error") === "auth" && (
          <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            That link is invalid or expired. Please sign in again.
          </p>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
