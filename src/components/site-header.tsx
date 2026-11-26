import { Suspense } from "react"

import { AppNav } from "@/components/app-nav"
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

/**
 * `home` is where the logo leads: the landing page on public pages (the proxy
 * forwards signed-in people to the app), Today inside the app — no extra hop.
 */
export function SiteHeader({ home = "/" }: { home?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-4">
        <div className="flex items-center gap-6">
          <Logo href={home} />
          {/* signed in: the app's sections (one nav — header row on desktop, tab bar on phones);
              signed out: the public pages worth a visit (desktop only). Reads the session + URL. */}
          <Suspense fallback={null}>
            <SessionNav />
          </Suspense>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
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

async function SessionNav() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getT()])
  if (user) return <AppNav />
  return (
    <nav aria-label={t.nav.main} className="hidden items-center gap-1 md:flex">
      {[
        { href: "/demo", label: t.demoPage.link },
        { href: "/templates", label: t.guides.link },
        { href: "/leaderboard", label: t.nav.leaderboard },
      ].map(({ href, label }) => (
        <Link key={href} href={href} className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          {label}
        </Link>
      ))}
    </nav>
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
    // phones reach all of this through the Profile tab
    <div className="max-md:hidden">
      <UserMenu
        email={user.email}
        username={profile?.username ?? "me"}
        displayName={profile?.display_name ?? null}
        isPublic={profile?.is_public ?? false}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  )
}
