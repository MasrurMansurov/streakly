import Link from "next/link"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">This page doesn&apos;t exist or the profile is private.</p>
      </div>
      <Button render={<Link href="/" />}>Back home</Button>
    </main>
  )
}
