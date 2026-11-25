import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { getT } from "@/i18n/server"
import { getWrappedData } from "@/lib/data"

import { WrappedStory } from "./wrapped-story"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  return { title: t.wrapped.shareTitle, robots: { index: false } }
}

export default function WrappedPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-[30rem] w-full max-w-sm rounded-2xl" />}>
      <Wrapped />
    </Suspense>
  )
}

async function Wrapped() {
  const data = await getWrappedData()
  return <WrappedStory data={{ year: data.year, today: data.today, hours: data.hours, habits: data.habits }} />
}
