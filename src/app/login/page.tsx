import type { Metadata } from "next"
import { Suspense } from "react"

import { Logo } from "@/components/logo"

import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      {/* LoginForm reads ?error= from the URL */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}
