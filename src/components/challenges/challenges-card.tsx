"use client"

import { CheckIcon, PlusIcon, RotateCcwIcon, SwordsIcon, TrophyIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { acceptChallenge, leaveChallenge, rematchChallenge } from "@/app/actions/challenges"
import { HabitPicker, type HabitChoice } from "@/components/habit-picker"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/i18n/client"
import type { Challenge } from "@/lib/challenges"
import { habitColor } from "@/lib/habit-colors"
import { cn } from "@/lib/utils"

import { CreateChallengeDialog, type Person } from "./create-challenge-dialog"

type Run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => void

/** Challenges with live standings. Pass `people` to allow starting new ones. */
export function ChallengesCard({ challenges, habits, people }: { challenges: Challenge[]; habits: HabitChoice[]; people?: Person[] }) {
  const { t } = useI18n()
  const [pending, start] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [removing, setRemoving] = useState<Challenge | null>(null)

  const run: Run = (fn) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error)
      else if (res.message) toast.success(res.message)
    })

  return (
    <Card id="challenges" className="scroll-mt-24">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle className="flex items-center gap-2">
            <SwordsIcon className="size-4 text-rose-500" /> {t.challenges.title}
          </CardTitle>
          <CardDescription>{t.challenges.subtitle}</CardDescription>
        </div>
        {people && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon /> {t.challenges.new}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {challenges.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.challenges.empty}</p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {challenges.map((c) => (
              <ChallengeItem key={c.id} c={c} habits={habits} pending={pending} run={run} onRemove={() => setRemoving(c)} />
            ))}
          </ul>
        )}
      </CardContent>

      {people && <CreateChallengeDialog open={createOpen} onOpenChange={setCreateOpen} habits={habits} people={people} />}

      <Dialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{removing?.iOwn ? t.challenges.delete : t.challenges.leave}</DialogTitle>
            <DialogDescription>{removing?.iOwn ? t.challenges.deleteConfirm : removing?.title}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const c = removing!
                setRemoving(null)
                run(() => leaveChallenge(c.id))
              }}
            >
              {removing?.iOwn ? t.challenges.delete : t.challenges.leave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ChallengeItem({
  c,
  habits,
  pending,
  run,
  onRemove,
}: {
  c: Challenge
  habits: HabitChoice[]
  pending: boolean
  run: Run
  onRemove: () => void
}) {
  const { t } = useI18n()
  const x = t.challenges
  const [habitId, setHabitId] = useState<string | null>(habits[0]?.id ?? null)
  const owner = c.members.find((m) => m.status === "joined" && !m.isMe)

  return (
    <li className="grid content-start gap-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{c.title}</div>
          <div className="text-xs text-muted-foreground">
            {c.phase === "finished" ? x.finished : c.phase === "upcoming" ? x.startsIn : x.daysLeft(c.daysLeft)}
          </div>
        </div>
        {c.stake && (
          <span className="max-w-[55%] truncate rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-700 dark:text-amber-300" title={c.stake}>
            {c.stake}
          </span>
        )}
      </div>

      {c.myStatus === "invited" ? (
        <div className="grid gap-3">
          <p className="text-sm">{x.invitedBy(owner?.name ?? "")}</p>
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.pacts.noHabits}</p>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">{t.pacts.chooseYours}</span>
              <HabitPicker habits={habits} value={habitId} onChange={setHabitId} label={x.yourHabit} />
            </>
          )}
          <div className="flex gap-2">
            <Button size="sm" disabled={pending || !habitId} onClick={() => run(() => acceptChallenge(c.id, habitId!))}>
              {x.join}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => leaveChallenge(c.id))}>
              {x.decline}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ol className="grid gap-2" aria-label={c.title}>
            {c.members.map((m) => {
              const color = habitColor(m.habit?.color ?? "slate")
              return (
                <li key={m.id} className={cn("flex items-center gap-2.5 text-sm", m.status === "invited" && "opacity-60")}>
                  <span className="w-5 shrink-0 text-center text-xs text-muted-foreground tabular-nums">
                    {m.place === 1 && c.phase !== "upcoming" ? <TrophyIcon className="mx-auto size-4 text-amber-500" aria-label="1" /> : m.place ?? ""}
                  </span>
                  <Avatar className="size-7">
                    {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
                    <AvatarFallback className="text-[10px]">{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("truncate font-medium", m.isMe && "text-emerald-700 dark:text-emerald-400")}>
                        {m.name}
                        {m.isMe && <span className="font-normal text-muted-foreground"> ({x.you})</span>}
                      </span>
                      {m.doneToday && c.phase === "active" && (
                        <span title={x.doneToday} className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <CheckIcon className="size-3" strokeWidth={3} aria-label={x.doneToday} />
                        </span>
                      )}
                    </div>
                    {m.status === "joined" ? (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span className={cn("block h-full rounded-full", color.dot)} style={{ width: `${(m.score / c.totalDays) * 100}%` }} />
                        </span>
                        <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{x.points(m.score, c.totalDays)}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">{x.pending}</div>
                    )}
                    {m.habit && <div className="truncate text-xs text-muted-foreground">{m.habit.name}</div>}
                  </div>
                </li>
              )
            })}
          </ol>

          {c.phase === "finished" && c.winners.length > 0 && (
            <div className="grid gap-1 rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="font-medium">{x.winner(c.winners.map((w) => (w.isMe ? x.you : w.name)).join(", "))}</span>
              {c.stake && c.loser && <span className="text-muted-foreground">{x.stakeOwed(c.loser.isMe ? x.you : c.loser.name, c.stake)}</span>}
            </div>
          )}

          <div className="flex gap-2">
            {c.phase === "finished" && c.iOwn && (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => rematchChallenge(c.id))}>
                <RotateCcwIcon /> {x.rematch}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" disabled={pending} onClick={onRemove}>
              {c.iOwn ? x.delete : x.leave}
            </Button>
          </div>
        </>
      )}
    </li>
  )
}
