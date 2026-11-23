import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardData } from "@/lib/data"

import { DashboardView } from "./dashboard-view"

export const metadata: Metadata = { title: "Dashboard" }

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  )
}

async function Dashboard() {
  const { habits, logs, today, profile, archivedCount } = await getDashboardData()
  return <DashboardView habits={habits} logs={logs} today={today} profile={profile} archivedCount={archivedCount} />
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
