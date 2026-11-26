import type { Metadata } from "next"

import { getT } from "@/i18n/server"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { evaluateAchievements } from "@/lib/achievements"
import { getChallenges, getDashboardData, getPacts } from "@/lib/data"

import { DashboardView } from "./dashboard-view"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.dashboard }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  )
}

async function Dashboard() {
  const [{ habits, logs, today, profile, archivedCount, todayNotes, stats, repairs, pauses, strength, feelings }, pacts, challenges] =
    await Promise.all([
    getDashboardData(),
    getPacts(),
    getChallenges(),
  ])
  return (
    <DashboardView
      habits={habits}
      logs={logs}
      today={today}
      profile={profile}
      archivedCount={archivedCount}
      todayNotes={todayNotes}
      achievements={evaluateAchievements(stats)}
      pacts={pacts}
      challenges={challenges}
      repairs={repairs}
      pauses={pauses}
      strength={strength}
      feelings={feelings}
    />
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      {/* matches the summary strip */}
      <Skeleton className="h-[68px] rounded-xl" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
