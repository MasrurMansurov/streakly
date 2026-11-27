import { FlameIcon } from "lucide-react"

import { Link } from "@/components/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDictionary, type Locale } from "@/i18n"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

type Row = {
  person: { id: string; username: string; name: string; avatarUrl: string | null }
  streak: number
  meToday: boolean
  friendToday: boolean
}

/**
 * Shared streaks (growth plan 3.2): for each friend who follows back, the days in
 * a row you both checked in something — and whose turn it is today.
 */
export function SharedStreaksCard({ rows, locale }: { rows: Row[]; locale: Locale }) {
  if (rows.length === 0) return null
  const t = getDictionary(locale).shared
  const status = (r: Row) =>
    r.meToday && r.friendToday ? t.both : !r.meToday ? t.yourTurn : t.waiting(r.person.name)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.person.id} className="flex min-w-0 items-center gap-3">
              <Avatar className="size-9">
                {r.person.avatarUrl && <AvatarImage src={r.person.avatarUrl} alt="" />}
                <AvatarFallback>{initials(r.person.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link href={`/u/${r.person.username}`} className="block truncate font-medium hover:underline">
                  {r.person.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{r.streak > 0 ? status(r) : t.start}</p>
              </div>
              {r.streak > 0 && (
                <span className="flex shrink-0 items-center gap-1 text-sm" aria-label={t.days(r.streak)}>
                  <FlameIcon className={cn("size-4", r.meToday && r.friendToday ? "text-streak" : "text-streak/60")} aria-hidden />
                  <span className="font-brand font-semibold tabular-nums">{r.streak}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
