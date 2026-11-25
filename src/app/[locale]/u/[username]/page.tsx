import { FlameIcon, TrophyIcon } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Achievements } from "@/components/achievements"
import { Heatmap } from "@/components/heatmap"
import { SiteFooter } from "@/components/site-footer"
import { ProfileHeader } from "@/components/profile-header"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FollowButton } from "@/components/follow-button"
import { getFollowInfo, getPublicProfile, getToday } from "@/lib/data"
import { formatDay } from "@/i18n"
import { getT } from "@/i18n/server"
import { addDays, type ISODate } from "@/lib/dates"
import { evaluateAchievements, type AchievementId } from "@/lib/achievements"
import { habitColor } from "@/lib/habit-colors"
import { bridgesFor, habitStreak } from "@/lib/streaks"
import { cn } from "@/lib/utils"

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const data = await getPublicProfile(username.toLowerCase())
  const { t } = await getT()
  if (!data) return { title: t.publicProfile.notFound }
  const name = data.profile.display_name || `@${data.profile.username}`
  return {
    title: t.publicProfile.metaTitle(name),
    description: data.profile.bio ?? t.publicProfile.metaDescription(name, data.habits.length),
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
      <SiteFooter />
    </>
  )
}

async function PublicProfile({ params }: Props) {
  const { username } = await params
  const [data, { today }, { locale, t }] = await Promise.all([
    getPublicProfile(username.toLowerCase()),
    getToday(),
    getT(),
  ])
  if (!data) notFound()

  const { profile, habits } = data
  const earned = evaluateAchievements(data.stats).filter((a) => a.earned)
  const since = addDays(today, -(26 * 7 - 1))
  const logs = data.logs.filter((l) => l.log_date >= since && l.log_date <= today)

  const byHabit = new Map<string, Set<ISODate>>(habits.map((h) => [h.id, new Set()]))
  const perDay = new Map<ISODate, number>()
  for (const l of logs) {
    byHabit.get(l.habit_id)?.add(l.log_date)
    perDay.set(l.log_date, (perDay.get(l.log_date) ?? 0) + 1)
  }

  const name = profile.display_name || profile.username
  const streaks = habits.map((h) =>
    habitStreak(byHabit.get(h.id)!, today, h.target_per_week, bridgesFor(h.id, data.repairs, data.pauses))
  )
  // all-time, with freezes / vacation / repairs — the same number as achievements and the dashboard
  const best = data.stats.bestStreak
  const featuredIndex = habits.findIndex((h) => h.id === profile.featured_habit_id)

  return (
    <div className="grid gap-8">
      <ProfileHeader
        look={{
          name,
          username: profile.username,
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          status: profile.status,
          pronouns: profile.pronouns,
          banner: profile.banner,
          bannerUrl: profile.banner_url,
          accent: profile.accent,
          avatarFrame: profile.avatar_frame,
          links: profile.links,
          // only badges that are actually earned
          showcase: profile.showcase
            .filter((id) => earned.some((a) => a.id === id))
            .map((id) => ({ id: id as AchievementId, name: t.achievements.items[id as AchievementId].name })),
          featured: featuredIndex >= 0
            ? {
                name: habits[featuredIndex].name,
                color: habits[featuredIndex].color,
                streak: t.habit.streak(streaks[featuredIndex].current, streaks[featuredIndex].unit),
              }
            : null,
        }}
        subtitle={t.publicProfile.since(formatDay(locale, profile.created_at.slice(0, 10), { month: "long", year: "numeric" }))}
        labels={{ featured: t.appearance.featured, links: t.appearance.linksLabel }}
        action={
          // per-viewer (reads the session) → streams in separately from the cached profile
          <Suspense fallback={<Skeleton className="h-9 w-28" />}>
            <FollowArea profileId={profile.id} name={name} />
          </Suspense>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Card className="gap-1 p-4">
          <span className="text-xs text-muted-foreground">{t.publicProfile.habits}</span>
          <span className="text-2xl font-semibold">{habits.length}</span>
        </Card>
        <Card className="gap-1 p-4">
          <span className="text-xs text-muted-foreground">{t.publicProfile.checkIns}</span>
          <span className="text-2xl font-semibold">{logs.length}</span>
        </Card>
        <Card className="gap-1 p-4">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TrophyIcon className="size-3.5" aria-hidden /> {t.publicProfile.bestStreak}
          </span>
          <span className="text-2xl font-semibold">{t.dashboard.streakShort(best, "day")}</span>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.publicProfile.activity}</CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap counts={perDay} max={Math.max(1, habits.length)} today={today} locale={locale} />
        </CardContent>
      </Card>

      {earned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.achievements.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Achievements achievements={earned} locale={locale} earnedOnly />
          </CardContent>
        </Card>
      )}

      {habits.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-medium">{t.publicProfile.habits}</h2>
          {habits.map((h, i) => {
            const color = habitColor(h.color)
            return (
              <Card key={h.id} className="flex-row items-center gap-3 p-4">
                <span className={cn("size-2.5 shrink-0 rounded-full", color.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{h.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {h.target_per_week < 7 ? t.habit.timesWeek(h.target_per_week) : t.habit.everyDay}
                    {h.description && ` · ${h.description}`}
                  </div>
                </div>
                <span className={cn("inline-flex shrink-0 items-center gap-1 text-sm font-medium", streaks[i].current > 0 && color.text)}>
                  <FlameIcon className="size-4" /> {t.habit.streak(streaks[i].current, streaks[i].unit)}
                </span>
              </Card>
            )
          })}
        </section>
      )}
    </div>
  )
}

async function FollowArea({ profileId, name }: { profileId: string; name: string }) {
  const [info, { t }] = await Promise.all([getFollowInfo(profileId), getT()])
  return (
    <div className="ml-auto flex flex-col items-end gap-1">
      {!info.isSelf && (
        <FollowButton profileId={profileId} name={name} following={info.following} signedIn={info.signedIn} />
      )}
      <span className="text-xs text-muted-foreground">
        {t.friends.followers(info.followers)} · {t.friends.followingCount(info.followingCount)}
      </span>
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
