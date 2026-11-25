"use client"

import { ChartNoAxesColumnIcon, CircleCheckBigIcon, TrophyIcon, UsersIcon, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { Link } from "@/components/link"
import { splitLocale } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { cn } from "@/lib/utils"

type Item = { href: string; label: string; icon: LucideIcon }

function useItems(): Item[] {
  const { t } = useI18n()
  return [
    { href: "/dashboard", label: t.nav.dashboard, icon: CircleCheckBigIcon },
    { href: "/progress", label: t.nav.progress, icon: ChartNoAxesColumnIcon },
    { href: "/friends", label: t.nav.friends, icon: UsersIcon },
    { href: "/leaderboard", label: t.nav.leaderboard, icon: TrophyIcon },
  ]
}

function useActive() {
  const { path } = splitLocale(usePathname())
  return (href: string) => path === href || path.startsWith(`${href}/`) || (href === "/dashboard" && path.startsWith("/habits/"))
}

/** Desktop: the main sections in the header. */
export function HeaderNav() {
  const items = useItems()
  const active = useActive()
  const { t } = useI18n()
  return (
    <nav aria-label={t.nav.main} className="hidden items-center gap-1 md:flex">
      {items.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            active(href) ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

/** Phones: a native-style tab bar at the bottom (installed PWA friendly). */
export function TabBar() {
  const items = useItems()
  const active = useActive()
  const { t } = useI18n()
  return (
    <nav
      data-tabbar
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const on = active(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  on ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" strokeWidth={on ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
