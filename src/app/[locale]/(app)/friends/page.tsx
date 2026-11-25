import { SearchIcon, TrophyIcon, UsersIcon } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { ChallengesCard } from "@/components/challenges/challenges-card"
import { FollowButton } from "@/components/follow-button"
import { IconTile } from "@/components/icon-tile"
import { PactInviteButton } from "@/components/pact-invite-button"
import { InviteDialog } from "@/components/invite-dialog"
import { Link } from "@/components/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDay, intlLocale, type Locale } from "@/i18n"
import { getT } from "@/i18n/server"
import { getChallenges, getFriendsData, getMyHabitChoices, getPacts, searchPeople, type FeedItem } from "@/lib/data"
import { addDays } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.friends }
}

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { t, locale } = await getT()
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.friends.title}</h1>
          <p className="text-sm text-muted-foreground">{t.friends.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Suspense fallback={null}>
            <FriendsInvite />
          </Suspense>
          <Button variant="outline" render={<Link href="/leaderboard" />}>
            <TrophyIcon aria-hidden /> {t.nav.leaderboard}
          </Button>
        </div>
      </div>

      <form role="search" action={`/${locale}/friends`} className="grid gap-2">
        <label htmlFor="people-search" className="text-sm font-medium">
          {t.search.label}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Suspense fallback={<Input id="people-search" name="q" placeholder={t.search.placeholder} className="pl-8" />}>
              <SearchInput searchParams={searchParams} placeholder={t.search.placeholder} />
            </Suspense>
          </div>
          <Button type="submit">{t.search.submit}</Button>
        </div>
        <p className="text-xs text-muted-foreground">{t.search.hint}</p>
      </form>

      <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <Friends />
      </Suspense>
    </div>
  )
}

async function SearchInput({ searchParams, placeholder }: { searchParams: Promise<{ q?: string }>; placeholder: string }) {
  const { q } = await searchParams
  return (
    <Input id="people-search" name="q" type="search" defaultValue={q ?? ""} placeholder={placeholder} className="pl-8" autoComplete="off" />
  )
}

async function SearchResults({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams
  const query = q.trim()
  if (!query) return null
  const { t } = await getT()
  if (query.replace(/^@/, "").length < 2) return <p className="text-sm text-muted-foreground">{t.search.tooShort}</p>
  const people = await searchPeople(query)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.search.results(query)}</CardTitle>
      </CardHeader>
      <CardContent>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.search.none}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3">
            {people.map((p) => (
              <li key={p.id} className="flex min-w-0 items-center gap-3">
                <Avatar className="size-9">
                  {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
                  <AvatarFallback>{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Link href={`/u/${p.username}`} className="min-w-0 flex-1 hover:underline">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    @{p.username}
                    {p.bio ? ` · ${p.bio}` : ""}
                  </div>
                </Link>
                <FollowButton profileId={p.id} name={p.name} following={p.following} signedIn />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

async function Friends() {
  const [{ people, feed, today, timeZone }, { locale, t }, pacts, myHabits, challenges] = await Promise.all([
    getFriendsData(),
    getT(),
    getPacts(),
    getMyHabitChoices(),
    getChallenges(),
  ])
  const challengesCard = <ChallengesCard challenges={challenges} habits={myHabits} people={people} />
  const inPact = new Set(pacts.map((p) => p.partner.username))

  if (people.length === 0) {
    return (
      <div className="grid gap-6">
      {challengesCard}
      <Card className="items-center border-dashed py-12 text-center">
        <IconTile icon={UsersIcon} tone="sky" size="lg" />
        <div className="grid gap-1">
          <h2 className="font-medium">{t.friends.emptyTitle}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{t.friends.emptyText}</p>
        </div>
        <Button variant="outline" render={<Link href="/u/demo" />}>
          {t.friends.tryDemo}
        </Button>
      </Card>
      </div>
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
      {challengesCard}
      <Card>
        <CardHeader>
          <CardTitle>{t.friends.peopleTitle}</CardTitle>
          <CardDescription>{t.friends.followingCount(people.length)}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-3">
            {people.map((p) => (
              <li key={p.id} className="flex min-w-0 items-center gap-3">
                <Avatar className="size-9">
                  {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
                  <AvatarFallback>{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Link href={`/u/${p.username}`} className="min-w-0 flex-1 hover:underline">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.status ? p.status : `@${p.username}`}</div>
                </Link>
                <PactInviteButton inviteeId={p.id} name={p.name} habits={myHabits} inPact={inPact.has(p.username)} />
                <FollowButton profileId={p.id} name={p.name} following signedIn />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {feed.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">{t.friends.feedEmpty}</p>
      ) : (
        <>
          {[...days].slice(0, 3).map(([date, items]) => (
            <FeedDay key={date} label={dayLabel(date)} items={items} locale={locale} timeZone={timeZone} />
          ))}
          {days.size > 3 && (
            <details className="group grid gap-6">
              <summary className="cursor-pointer list-none text-center text-sm text-muted-foreground hover:text-foreground">
                {t.friends.olderDays(days.size - 3)}
              </summary>
              <div className="mt-6 grid gap-6">
                {[...days].slice(3).map(([date, items]) => (
                  <FeedDay key={date} label={dayLabel(date)} items={items} locale={locale} timeZone={timeZone} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}

/** One day of the feed: one row per person, their check-ins as small chips. */
function FeedDay({ label, items, locale, timeZone }: { label: string; items: FeedItem[]; locale: Locale; timeZone: string }) {
  const byPerson = new Map<string, FeedItem[]>()
  for (const item of items) byPerson.set(item.person.username, [...(byPerson.get(item.person.username) ?? []), item])
  const time = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale[locale], { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(iso))
  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
      <Card className="gap-0 py-0">
        <ul className="divide-y">
          {[...byPerson.values()].map((done) => {
            const person = done[0].person
            return (
              <li key={person.username} className="flex items-start gap-3 px-4 py-3">
                <Avatar className="size-8">
                  {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
                  <AvatarFallback className="text-xs">{person.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={`/u/${person.username}`} className="truncate text-sm font-medium hover:underline">
                      {person.name}
                    </Link>
                    {/* newest check-in of the day */}
                    <time className="shrink-0 text-xs text-muted-foreground">{time(done[0].createdAt)}</time>
                  </div>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {done.map((item, i) => (
                      <li key={i} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs">
                        <span className={cn("size-1.5 rounded-full", habitColor(item.habit.color).dot)} aria-hidden />
                        {item.habit.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </section>
  )
}

/** "Invite a friend" in the header (needs the user's habits for the optional pact). */
async function FriendsInvite() {
  const habits = await getMyHabitChoices()
  return <InviteDialog habits={habits} />
}
