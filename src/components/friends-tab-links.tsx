"use client"

import { usePathname } from "next/navigation"

import { Link } from "@/components/link"
import { splitLocale } from "@/i18n"
import { cn } from "@/lib/utils"

export function FriendsTabLinks({ label, following, leaderboard }: { label: string; following: string; leaderboard: string }) {
  const { path } = splitLocale(usePathname())
  return (
    <nav aria-label={label} className="flex w-fit gap-1 rounded-lg border bg-card p-0.5 text-sm">
      {[
        { href: "/friends", text: following },
        { href: "/leaderboard", text: leaderboard },
      ].map(({ href, text }) => {
        const on = path === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors",
              on ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {text}
          </Link>
        )
      })}
    </nav>
  )
}
