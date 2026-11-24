import type { Metadata } from "next"

import { Logo } from "@/components/logo"
import { getT } from "@/i18n/server"

import { LoginForm } from "./login-form"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.signIn }
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <LoginForm />
    </main>
  )
}
