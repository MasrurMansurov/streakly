"use client"

import { ChartNoAxesColumnIcon, CircleCheckBigIcon, CircleUserRoundIcon, UsersIcon, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { Link } from "@/components/link"
import { splitLocale } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { SECTIONS, sectionOf, type Section } from "@/lib/nav"
import { cn } from "@/lib/utils"

const ICONS: Record<Section, LucideIcon> = {
  today: CircleCheckBigIcon,
  progress: ChartNoAxesColumnIcon,
  friends: UsersIcon,
  me: CircleUserRoundIcon,
}

/**
 * The one main navigation, a single landmark for every screen size: a row of
 * three sections in the header from 768px, a fixed four-tab bar at the bottom
 * on phones (Profile is the fourth tab there; on desktop it's the avatar menu).
 * Opaque surfaces, no blur; the active item is marked by ink, weight and a
 * bar — not by the brand color.
 */
export function AppNav() {
  const { t } = useI18n()
  const current = sectionOf(splitLocale(usePathname()).path)
  const labels: Record<Section, string> = { today: t.nav.dashboard, progress: t.nav.progress, friends: t.nav.friends, me: t.nav.me }

  return (
    <nav
      data-tabbar
      aria-label={t.nav.main}
      className="max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:border-t max-md:bg-background max-md:pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 md:flex md:max-w-none md:items-center md:gap-1">
        {SECTIONS.map(({ id, href, phoneOnly }) => {
          const on = current === id
          const Icon = ICONS[id]
          return (
            <li key={id} className={cn(phoneOnly && "md:hidden")}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] transition-colors",
                  "md:h-14 md:flex-row md:px-3 md:py-0 md:text-sm",
                  // the active bar: on top of the tab on phones, under the label in the header
                  "after:absolute after:inset-x-6 after:top-0 after:h-0.5 after:rounded-full md:after:inset-x-3 md:after:top-auto md:after:bottom-0",
                  on ? "font-semibold text-foreground after:bg-foreground" : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5 md:hidden" strokeWidth={on ? 2.25 : 1.75} aria-hidden />
                {labels[id]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
