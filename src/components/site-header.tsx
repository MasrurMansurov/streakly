import { Suspense } from "react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { Link } from "@/components/link"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserMenu } from "@/components/user-menu"
import { getT } from "@/i18n/server"
import { getCurrentUser } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Logo />
        <div className="flex items-center gap-1">
          {/* reads the current URL (usePathname) → keep it out of the static shell */}
          <Suspense fallback={<div className="h-8 w-12" />}>
            <LanguageSwitcher />
          </Suspense>
          <ThemeToggle />
          {/* reads the session → streams in behind its own boundary */}
          <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
            <UserArea />
          </Suspense>
        </div>
      </div>
    </header>
  )
}

async function UserArea() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getT()])
  if (!user) {
    return (
      <Button size="sm" render={<Link href="/login" />}>
        {t.common.signIn}
      </Button>
    )
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, is_public, avatar_url")
    .eq("id", user.id)
    .single()

  return (
    <UserMenu
      email={user.email}
      username={profile?.username ?? "me"}
      displayName={profile?.display_name ?? null}
      isPublic={profile?.is_public ?? false}
      avatarUrl={profile?.avatar_url ?? null}
    />
  )
}
