"use client"

import { SparklesIcon } from "lucide-react"

import { Link } from "@/components/link"
import { Notice } from "@/components/notice"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"
import type { ISODate } from "@/lib/dates"
import { isWrappedSeason } from "@/lib/wrapped-season"

export function WrappedBanner({ today }: { today: ISODate }) {
  const { t } = useI18n()
  if (!isWrappedSeason(today)) return null
  const year = Number(today.slice(0, 4)) - (today.slice(5) <= "01-15" ? 1 : 0)
  return (
    <Notice
      icon={SparklesIcon}
      tone="warning"
      title={t.wrapped.banner(year)}
      action={
        <Button size="sm" render={<Link href="/wrapped" />}>
          {t.wrapped.open}
        </Button>
      }
    />
  )
}
