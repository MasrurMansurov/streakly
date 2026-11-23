import { CheckCircle2Icon } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { FollowButton } from "@/components/follow-button"
import { Icon3D } from "@/components/icon-3d"
import { Link } from "@/components/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDay, intlLocale, type Dictionary, type Locale } from "@/i18n"
import { getT } from "@/i18n/server"
import { getFriendsData, type FeedItem } from "@/lib/data"
import { addDays } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.friends }
}

export default async function FriendsPage() {
  const { t } = await getT()
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.friends.title}</h1>
        <p className="text-sm text-muted-foreground">{t.friends.subtitle}</p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <Friends />
      </Suspense>
    </div>
  )
}

async function Friends() {
  const [{ people, feed, today, timeZone }, { locale, t }] = await Promise.all([getFriendsData(), getT()])

  if (people.length === 0) {
    return (
      <Card className="items-center border-dashed py-12 text-center">
        <Icon3D name="people" size={72} className="motion-safe:animate-float" />
        <div className="grid gap-1">
          <h2 className="font-medium">{t.friends.emptyTitle}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{t.friends.emptyText}</p>
        </div>
        <Button variant="outline" render={<Link href="/u/demo" />}>
          {t.friends.tryDemo}
        </Button>
      </Card>
    )
  }

  // group the feed by day, newest first
  const days = new Map<string, FeedItem[]>()
  const sorted = [...feed].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  for (const item of sorted) days.set(item.date, [...(days.get(item.date) ?? []), item])

  const dayLabel = (date: string) =>
    date === today
      ? t.friends.today
      : date === addDays(today, -1)
        ? t.friends.yesterday
        : formatDay(locale, date, { weekday: "long", month: "long", day: "numeric" })

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.friends.peopleTitle}</CardTitle>
          <CardDescription>{t.friends.followingCount(people.length)}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar className="size-9">
                  {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
                  <AvatarFallback>{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Link href={`/u/${p.username}`} className="min-w-0 flex-1 hover:underline">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">@{p.username}</div>
                </Link>
                <FollowButton profileId={p.id} name={p.name} following signedIn />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {feed.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">{t.friends.feedEmpty}</p>
      ) : (
        [...days].map(([date, items]) => (
          <section key={date} className="grid gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">{dayLabel(date)}</h2>
            <Card className="gap-0 py-0">
              <ul className="divide-y">
                {items.map((item, i) => (
                  <FeedRow key={i} item={item} locale={locale} t={t} timeZone={timeZone} />
                ))}
              </ul>
            </Card>
          </section>
        ))
      )}
    </div>
  )
}

function FeedRow({ item, locale, t, timeZone }: { item: FeedItem; locale: Locale; t: Dictionary; timeZone: string }) {
  const color = habitColor(item.habit.color)
  const time = new Intl.DateTimeFormat(intlLocale[locale], { hour: "2-digit", minute: "2-digit", timeZone }).format(
    new Date(item.createdAt)
  )
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar className="size-8">
        {item.person.avatarUrl && <AvatarImage src={item.person.avatarUrl} alt="" />}
        <AvatarFallback className="text-xs">{item.person.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <p className="min-w-0 flex-1 text-sm">
        <Link href={`/u/${item.person.username}`} className="font-medium hover:underline">
          {item.person.name}
        </Link>{" "}
        <span className="text-muted-foreground">{t.friends.completed}</span>{" "}
        <span className="inline-flex items-center gap-1 font-medium">
          <span className={cn("size-2 rounded-full", color.dot)} />
          {item.habit.name}
        </span>
      </p>
      <CheckCircle2Icon className={cn("size-4 shrink-0", color.text)} />
      <time className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{time}</time>
    </li>
  )
}
