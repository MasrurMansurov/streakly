import { FlameIcon, TrophyIcon } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Heatmap } from "@/components/heatmap"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getPublicProfile, getToday } from "@/lib/data"
import { addDays, formatDate, type ISODate } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { formatStreak, habitStreak, longestStreak } from "@/lib/streaks"
import { cn } from "@/lib/utils"

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const data = await getPublicProfile(username.toLowerCase())
  if (!data) return { title: "Profile not found" }
  const name = data.profile.display_name || `@${data.profile.username}`
  return {
    title: `${name}'s habits`,
    description: data.profile.bio ?? `${name} is building ${data.habits.length} habits on Streakly.`,
  }
}

export default function PublicProfilePage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Suspense fallback={<ProfileSkeleton />}>
          <PublicProfile params={params} />
        </Suspense>
      </main>
    </>
  )
}

async function PublicProfile({ params }: Props) {
  const { username } = await params
  const [data, { today }] = await Promise.all([getPublicProfile(username.toLowerCase()), getToday()])
  if (!data) notFound()

  const { profile, habits } = data
  const since = addDays(today, -(26 * 7 - 1))
  const logs = data.logs.filter((l) => l.log_date >= since && l.log_date <= today)

  const byHabit = new Map<string, Set<ISODate>>(habits.map((h) => [h.id, new Set()]))
  const perDay = new Map<ISODate, number>()
  for (const l of logs) {
    byHabit.get(l.habit_id)?.add(l.log_date)
    perDay.set(l.log_date, (perDay.get(l.log_date) ?? 0) + 1)
  }

  const name = profile.display_name || profile.username
  const streaks = habits.map((h) => habitStreak(byHabit.get(h.id)!, today, h.target_per_week))
  const best = Math.max(0, ...habits.map((h) => longestStreak(byHabit.get(h.id)!)))

  return (
    <div className="grid gap-8">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
          <AvatarFallback className="text-lg">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">
            @{profile.username} · since {formatDate(profile.created_at.slice(0, 10), { month: "long", year: "numeric" })}
          </p>
          {profile.bio && <p className="mt-1 text-sm">{profile.bio}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="gap-1 p-4">
          <span className="text-xs text-muted-foreground">Habits</span>
          <span className="text-2xl font-semibold tabular-nums">{habits.length}</span>
        </Card>
        <Card className="gap-1 p-4">
          <span className="text-xs text-muted-foreground">Check-ins</span>
          <span className="text-2xl font-semibold tabular-nums">{logs.length}</span>
        </Card>
        <Card className="gap-1 p-4">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TrophyIcon className="size-3.5" /> Best streak
          </span>
          <span className="text-2xl font-semibold tabular-nums">{best}d</span>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap counts={perDay} max={Math.max(1, habits.length)} today={today} />
        </CardContent>
      </Card>

      {habits.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-medium">Habits</h2>
          {habits.map((h, i) => {
            const color = habitColor(h.color)
            return (
              <Card key={h.id} className="flex-row items-center gap-3 p-4">
                <span className={cn("size-2.5 shrink-0 rounded-full", color.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{h.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {h.target_per_week < 7 ? `${h.target_per_week}× a week` : "Every day"}
                    {h.description && ` · ${h.description}`}
                  </div>
                </div>
                <span className={cn("inline-flex shrink-0 items-center gap-1 text-sm font-medium", streaks[i].current > 0 && color.text)}>
                  <FlameIcon className="size-4" /> {formatStreak(streaks[i])}
                </span>
              </Card>
            )
          })}
        </section>
      )}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-8">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
