import { TrophyIcon } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { Link } from "@/components/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Dictionary } from "@/i18n"
import { getT } from "@/i18n/server"
import { getCurrentUser, getLeaderboard, type LeaderboardRow } from "@/lib/data"
import { nextRank, rankFor, RANKS } from "@/lib/ranks"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  return { title: t.leaderboard.title, description: t.leaderboard.subtitle }
}

const PODIUM = ["text-amber-500", "text-zinc-400", "text-orange-700 dark:text-orange-400"]

export default async function LeaderboardPage() {
  const [{ t }, rows] = await Promise.all([getT(), getLeaderboard()])
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10">
          <div className="grid gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <TrophyIcon className="size-6 text-amber-500" /> {t.leaderboard.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.leaderboard.subtitle}</p>
            <p className="text-xs text-muted-foreground">{t.leaderboard.how}</p>
          </div>

          <Suspense fallback={null}>
            <YourPlace rows={rows} t={t} />
          </Suspense>

          {rows.length === 0 ? (
            <Card className="items-center border-dashed py-12 text-center text-sm text-muted-foreground">{t.leaderboard.empty}</Card>
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-12 px-3 py-2.5 text-left font-medium">{t.leaderboard.place}</th>
                    <th scope="col" className="px-3 py-2.5 text-left font-medium">{t.leaderboard.person}</th>
                    <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">{t.leaderboard.checkins}</th>
                    <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">{t.leaderboard.activeDays}</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">{t.leaderboard.score}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r, i) => (
                    <Row key={r.username} row={r} place={i + 1} t={t} />
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <section className="grid gap-3">
            <h2 className="text-sm font-medium">{t.leaderboard.ranksTitle}</h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
              {RANKS.map((r) => (
                <li key={r.key} className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", r.dot)} />
                  <span className={cn("font-medium", r.text)}>{t.leaderboard.ranks[r.key]}</span>
                  <span className="text-muted-foreground tabular-nums">{r.min}+</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

function Row({ row, place, t }: { row: LeaderboardRow; place: number; t: Dictionary }) {
  const rank = rankFor(row.score)
  return (
    <tr className="transition-colors hover:bg-muted/40">
      <td className="px-3 py-2.5 tabular-nums">
        {place <= 3 ? <TrophyIcon className={cn("size-4", PODIUM[place - 1])} aria-label={`#${place}`} /> : place}
      </td>
      <td className="px-3 py-2.5">
        <Link href={`/u/${row.username}`} className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-8">
            {row.avatarUrl && <AvatarImage src={row.avatarUrl} alt="" />}
            <AvatarFallback className="text-xs">{row.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className={cn("block truncate font-semibold hover:underline", rank.text)}>{row.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {t.leaderboard.ranks[rank.key]} · @{row.username}
            </span>
          </span>
        </Link>
      </td>
      <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{row.checkins}</td>
      <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{row.activeDays}</td>
      <td className="px-3 py-2.5 text-right font-heading font-semibold tabular-nums">{row.score}</td>
    </tr>
  )
}

/** Signed-in viewers: where they stand and what's next. */
async function YourPlace({ rows, t }: { rows: LeaderboardRow[]; t: Dictionary }) {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()
  const { data: me } = await supabase.from("profiles").select("username, is_public").eq("id", user.id).single()
  if (!me) return null
  const index = rows.findIndex((r) => r.username === me.username)
  if (index === -1) {
    return (
      <Card className="flex-row flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <span className="text-muted-foreground">{t.leaderboard.notListed}</span>
        {!me.is_public && (
          <Button size="sm" variant="outline" render={<Link href="/settings" />}>
            {t.leaderboard.makePublic}
          </Button>
        )}
      </Card>
    )
  }
  const row = rows[index]
  const next = nextRank(row.score)
  return (
    <Card className="gap-1 border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
      <span className="font-medium">{t.leaderboard.yourPlace(index + 1, row.score)}</span>
      {next && <span className="text-muted-foreground">{t.leaderboard.nextRank(t.leaderboard.ranks[next.rank.key], next.missing)}</span>}
    </Card>
  )
}
