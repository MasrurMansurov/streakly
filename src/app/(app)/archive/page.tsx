import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getArchivedHabits } from "@/lib/data"

import { ArchivedList } from "./archived-list"

export const metadata: Metadata = { title: "Archive" }

export default function ArchivePage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="grid gap-2">
        <Button variant="ghost" size="sm" className="w-fit" render={<Link href="/dashboard" />}>
          <ArrowLeftIcon /> Dashboard
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
        <p className="text-sm text-muted-foreground">
          Archived habits keep their history but are hidden from your dashboard and public profile.
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
