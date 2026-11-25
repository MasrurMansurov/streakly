"use client"

import { SparklesIcon } from "lucide-react"

import { Link } from "@/components/link"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"
import type { ISODate } from "@/lib/dates"

/** Dec 1 – Jan 15: the year's recap is one tap away on the Today screen. */
export function isWrappedSeason(today: ISODate) {
  const md = today.slice(5)
  return md >= "12-01" || md <= "01-15"
}

export function WrappedBanner({ today }: { today: ISODate }) {
  const { t } = useI18n()
  if (!isWrappedSeason(today)) return null
  const year = Number(today.slice(0, 4)) - (today.slice(5) <= "01-15" ? 1 : 0)
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
      <SparklesIcon className="size-4 shrink-0 text-amber-500" aria-hidden />
      <span className="min-w-0 flex-1 font-medium">{t.wrapped.banner(year)}</span>
      <Button size="sm" render={<Link href="/wrapped" />}>
        {t.wrapped.open}
      </Button>
    </div>
  )
}
