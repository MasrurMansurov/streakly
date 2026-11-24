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
    <Suspense fallback={<Skeleton className="h-[40rem] rounded-xl" />}>
      <Progress />
    </Suspense>
  )
}

async function Progress() {
  const [{ habits, logs, today, stats, feelings }, letter] = await Promise.all([getDashboardData(), getWeeklyLetter()])
  // the AI letter appears only when an API key is configured
  const letterCard = process.env.ANTHROPIC_API_KEY ? <LetterCard letter={letter} /> : null
  return (
    <ProgressView
      habits={habits}
      logs={logs}
      today={today}
      feelings={feelings}
      achievements={evaluateAchievements(stats)}
      letter={letterCard}
    />
  )
}
