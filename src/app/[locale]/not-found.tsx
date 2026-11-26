"use client"

import { Link } from "@/components/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"

export default function NotFound() {
  const { t } = useI18n()
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">{t.notFound.title}</h1>
        <p className="text-sm text-muted-foreground">{t.notFound.text}</p>
      </div>
      <Button render={<Link href="/" />}>{t.notFound.backHome}</Button>
    </main>
  )
}
