import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { getT } from "@/i18n/server"
import { evaluateAchievements } from "@/lib/achievements"
import { getDashboardData } from "@/lib/data"

import { ProgressView } from "./progress-view"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.progress }
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] rounded-xl" />}>
      <Progress />
    </Suspense>
  )
}

async function Progress() {
  const { habits, logs, today, stats, feelings } = await getDashboardData()
  return <ProgressView habits={habits} logs={logs} today={today} feelings={feelings} achievements={evaluateAchievements(stats)} />
}
