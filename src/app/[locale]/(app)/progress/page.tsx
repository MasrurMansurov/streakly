import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { getT } from "@/i18n/server"
import { evaluateAchievements } from "@/lib/achievements"
import { getDashboardData, getWeeklyLetter } from "@/lib/data"

import { LetterCard } from "./letter-card"
import { ProgressView } from "./progress-view"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.progress }
}

export default function ProgressPage() {
  return (
    <Suspense
      fallback={
        // the page's own shape: title, this week, insights, activity + 30 days
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-5">
            <Skeleton className="h-64 rounded-xl lg:col-span-3" />
            <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          </div>
        </div>
      }
    >
      <Progress />
    </Suspense>
  )
}

async function Progress() {
  const [{ habits, logs, today, stats, feelings, repairs, pauses }, letter] = await Promise.all([getDashboardData(), getWeeklyLetter()])
  // the AI letter appears only when an API key is configured
  const letterCard = process.env.ANTHROPIC_API_KEY ? <LetterCard letter={letter} /> : null
  return (
    <ProgressView
      habits={habits}
      logs={logs}
      today={today}
      feelings={feelings}
      repairs={repairs}
      pauses={pauses}
      achievements={evaluateAchievements(stats)}
      letter={letterCard}
    />
  )
}
