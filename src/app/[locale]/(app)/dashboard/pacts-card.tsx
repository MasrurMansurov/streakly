"use client"

import { CameraIcon, CheckIcon, CircleIcon, FlameIcon, HandshakeIcon, LockIcon, XIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { acceptPact, leavePact } from "@/app/actions/pacts"
import { HabitPicker, type HabitChoice } from "@/components/habit-picker"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/i18n/client"
import type { ISODate } from "@/lib/dates"
import { habitColor } from "@/lib/habit-colors"
import { duoStreak, type Pact } from "@/lib/pacts"

import { ProofDialog } from "./proof-dialog"
import { cn } from "@/lib/utils"

type Props = { pacts: Pact[]; byHabit: Map<string, Set<ISODate>>; today: ISODate; habits: HabitChoice[] }

export function PactsCard({ pacts, byHabit, today, habits }: Props) {
  const { t } = useI18n()
  const [pending, start] = useTransition()
  const [ending, setEnding] = useState<Pact | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error)
      else if (res.message) toast.success(res.message)
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HandshakeIcon className="size-4 text-sky-500" /> {t.pacts.title}
        </CardTitle>
        <CardDescription>{t.pacts.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-4 md:grid-cols-2">
          {pacts.map((pact) => (
            <li key={pact.id} className="grid gap-3 rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  {pact.partner.avatarUrl && <AvatarImage src={pact.partner.avatarUrl} alt="" />}
                  <AvatarFallback>{pact.partner.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{pact.partner.name}</div>
                  <div className="truncate text-xs text-muted-foreground">@{pact.partner.username}</div>
                </div>
                {pact.status === "active" && (
                  <Button variant="ghost" size="icon-sm" aria-label={t.pacts.end} onClick={() => setEnding(pact)}>
                    <XIcon />
                  </Button>
                )}
              </div>

              {pact.status === "active" ? (
                <ActivePact pact={pact} mine={pact.myHabit ? byHabit.get(pact.myHabit.id) : undefined} today={today} />
              ) : pact.iInvited ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{t.pacts.pendingSent(pact.partner.name)}</p>
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => leavePact(pact.id))}>
                    {t.pacts.cancel}
                  </Button>
                </div>
              ) : (
                <ReceivedInvite pact={pact} habits={habits} pending={pending} run={run} />
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={ending !== null} onOpenChange={(o) => !o && setEnding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.pacts.end}</DialogTitle>
            <DialogDescription>{t.pacts.endConfirm(ending?.partner.name ?? "")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnding(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const p = ending!
                setEnding(null)
                run(() => leavePact(p.id))
              }}
            >
              {t.pacts.end}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ActivePact({ pact, mine, today }: { pact: Pact; mine: Set<ISODate> | undefined; today: ISODate }) {
  const { t } = useI18n()
  const s = duoStreak(mine ?? new Set(), new Set(pact.partnerDates), today)
  const rows = [
    { who: t.pacts.you, habit: pact.myHabit?.name ?? t.pacts.habitArchived, done: s.meToday },
    { who: pact.partner.name, habit: pact.partnerHabit?.name ?? "—", done: s.partnerToday, color: pact.partnerHabit?.color },
  ]
  return (
    <>
      <div className="flex items-baseline gap-2">
        <FlameIcon className={cn("size-5 self-center", s.current > 0 ? "text-orange-500" : "text-muted-foreground/50")} />
        <span className="font-heading text-2xl font-semibold tabular-nums">{s.current}</span>
        <span className="text-sm text-muted-foreground">{t.pacts.duoUnit(s.current)}</span>
        <span className="ml-auto text-xs text-muted-foreground">{t.pacts.best(s.best)}</span>
      </div>
      <ul className="grid gap-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.who} className="flex items-center gap-2">
            {r.done ? (
              <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckIcon className="size-3" strokeWidth={3} />
              </span>
            ) : (
              <CircleIcon className="size-4 text-muted-foreground/50" />
            )}
            <span className="font-medium">{r.who}</span>
            <span className="min-w-0 truncate text-muted-foreground">· {r.habit}</span>
            <span className={cn("ml-auto shrink-0 text-xs", r.done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {r.done ? t.pacts.doneToday : t.pacts.notYet}
            </span>
          </li>
        ))}
      </ul>
      <Proofs pact={pact} meToday={s.meToday} />
      <p
        className={cn(
          "rounded-md px-2.5 py-1.5 text-xs",
          s.meToday && s.partnerToday ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
        )}
      >
        {s.meToday && s.partnerToday
          ? t.pacts.bothDone
          : s.meToday
            ? t.pacts.nudgePartner(pact.partner.name)
            : t.pacts.nudgeYou}
      </p>
    </>
  )
}

function ReceivedInvite({
  pact,
  habits,
  pending,
  run,
}: {
  pact: Pact
  habits: HabitChoice[]
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => void
}) {
  const { t } = useI18n()
  const [habitId, setHabitId] = useState<string | null>(habits[0]?.id ?? null)
  const color = habitColor(pact.partnerHabit?.color ?? "emerald")
  return (
    <div className="grid gap-3">
      <p className="text-sm">
        <span className={cn("mr-1.5 inline-block size-2 rounded-full", color.dot)} />
        {t.pacts.pendingReceived(pact.partner.name, pact.partnerHabit?.name ?? "—")}
      </p>
      {habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.pacts.noHabits}</p>
      ) : (
        <>
          <span className="text-xs text-muted-foreground">{t.pacts.chooseYours}</span>
          <HabitPicker habits={habits} value={habitId} onChange={setHabitId} label={t.pacts.yourHabit} />
        </>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={pending || !habitId} onClick={() => run(() => acceptPact(pact.id, habitId!))}>
          {t.pacts.accept}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => leavePact(pact.id))}>
          {t.pacts.decline}
        </Button>
      </div>
    </div>
  )
}

/** Today's proofs: mine (add/edit once I've checked in) and the partner's — locked until I check in. */
function Proofs({ pact, meToday }: { pact: Pact; meToday: boolean }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const p = pact.proofs
  if (!p) return null
  const partner = p.partner
  if (!meToday && !partner && !p.partnerLocked) return null

  return (
    <div className="grid gap-2">
      {partner ? (
        <div className="flex items-center gap-3 rounded-lg border p-2">
          {partner.photoUrl && (
            <button type="button" onClick={() => setViewing(partner.photoUrl)} aria-label={t.proof.open} className="shrink-0 overflow-hidden rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
              <img src={partner.photoUrl} alt="" className="size-12 object-cover" />
            </button>
          )}
          <div className="min-w-0 text-sm">
            <div className="text-xs text-muted-foreground">{t.proof.partnerProof(pact.partner.name)}</div>
            {partner.note && <div className="line-clamp-2">{partner.note}</div>}
          </div>
        </div>
      ) : p.partnerLocked ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          <LockIcon className="size-3.5 shrink-0" /> {t.proof.locked}
        </div>
      ) : null}

      {meToday && (
        <Button size="sm" variant="outline" className="w-fit" onClick={() => setEditing(true)}>
          <CameraIcon /> {p.mine ? t.proof.edit : t.proof.add}
        </Button>
      )}

      {editing && <ProofDialog open={editing} onOpenChange={setEditing} pactId={pact.id} current={p.mine} />}
      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="p-2 sm:max-w-xl">
          <DialogTitle className="sr-only">{t.proof.partnerProof(pact.partner.name)}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
          {viewing && <img src={viewing} alt="" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
