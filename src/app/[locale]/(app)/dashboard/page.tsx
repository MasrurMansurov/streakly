import type { Metadata } from "next"

import { getT } from "@/i18n/server"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { evaluateAchievements } from "@/lib/achievements"
import { getChallenges, getDashboardData, getPacts, getRecentCheers } from "@/lib/data"

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
  const [{ habits, logs, today, profile, archivedCount, todayNotes, todaySteps, stats, repairs, pauses, strength, feelings, spareRepairs }, pacts, challenges, cheers] =
    await Promise.all([
    getDashboardData(),
    getPacts(),
    getChallenges(),
    getRecentCheers(),
  ])
  return (
    <DashboardView
      habits={habits}
      logs={logs}
      today={today}
      profile={profile}
      archivedCount={archivedCount}
      todayNotes={todayNotes}
      todaySteps={todaySteps}
      achievements={evaluateAchievements(stats)}
      pacts={pacts}
      challenges={challenges}
      repairs={repairs}
      pauses={pauses}
      strength={strength}
      feelings={feelings}
      cheers={cheers}
      spareRepairs={spareRepairs}
    />
  )
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
