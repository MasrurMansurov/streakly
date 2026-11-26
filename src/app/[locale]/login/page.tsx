import type { Metadata } from "next"

import { Logo } from "@/components/logo"
import { TryDemoButton } from "@/components/try-demo-button"
import { getT } from "@/i18n/server"
import { getEnabledProviders } from "@/lib/auth-providers"
import { NOINDEX } from "@/lib/seo"

import { LoginForm } from "./login-form"

export async function generateMetadata(): Promise<Metadata> {
  // a sign-in form has nothing to rank for — keep it out of search
  return { title: (await getT()).t.meta.signIn, robots: NOINDEX }
}

export default async function LoginPage() {
  const providers = await getEnabledProviders()
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <LoginForm providers={providers} />
      <TryDemoButton variant="ghost" />
    </main>
  )
}
