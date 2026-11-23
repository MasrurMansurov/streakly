import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"

import { Suspense } from "react"

import { Link } from "@/components/link"
import { Button } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { Skeleton } from "@/components/ui/skeleton"
import { getArchivedHabits } from "@/lib/data"

import { ArchivedList } from "./archived-list"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.archive }
}

export default async function ArchivePage() {
  const { t } = await getT()
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="grid gap-2">
        <Button variant="ghost" size="sm" className="w-fit" render={<Link href="/dashboard" />}>
          <ArrowLeftIcon /> {t.common.dashboard}
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t.archive.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.archive.subtitle}
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
        <Archive />
      </Suspense>
    </div>
  )
}

async function Archive() {
  const habits = await getArchivedHabits()
  return <ArchivedList habits={habits} />
}
