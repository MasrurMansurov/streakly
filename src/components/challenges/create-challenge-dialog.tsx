"use client"

import { CheckIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createChallenge } from "@/app/actions/challenges"
import { HabitPicker, type HabitChoice } from "@/components/habit-picker"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/i18n/client"
import { cn } from "@/lib/utils"

export type Person = { id: string; name: string; username: string; avatarUrl: string | null }

const DURATIONS = [7, 14, 30] as const

function Chips({ items, onPick }: { items: readonly string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {s}
        </button>
      ))}
    </div>
  )
}

export function CreateChallengeDialog({
  open,
  onOpenChange,
  habits,
  people,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  habits: HabitChoice[]
  people: Person[]
}) {
  const { t } = useI18n()
  const c = t.challenges
  const [title, setTitle] = useState("")
  const [stake, setStake] = useState("")
  const [days, setDays] = useState<(typeof DURATIONS)[number]>(7)
  const [habitId, setHabitId] = useState<string | null>(habits[0]?.id ?? null)
  const [invitees, setInvitees] = useState<string[]>([])
  const [pending, start] = useTransition()

  const toggle = (id: string) =>
    setInvitees((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length < 5 ? [...list, id] : list))

  const submit = () =>
    start(async () => {
      const res = await createChallenge({ title, stake, habitId: habitId ?? "", days, invitees })
      if (!res.ok) return void toast.error(res.error)
      toast.success(res.message)
      onOpenChange(false)
      setTitle("")
      setStake("")
      setInvitees([])
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{c.createTitle}</DialogTitle>
          <DialogDescription>{c.createText}</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="challenge-title">{c.name}</Label>
            <Input id="challenge-title" value={title} maxLength={60} placeholder={c.namePlaceholder} onChange={(e) => setTitle(e.target.value)} />
            <Chips items={c.nameIdeas} onPick={setTitle} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="challenge-stake">{c.stake}</Label>
            <Input id="challenge-stake" value={stake} maxLength={80} placeholder={c.stakePlaceholder} onChange={(e) => setStake(e.target.value)} />
            <Chips items={c.stakeIdeas} onPick={setStake} />
          </div>

          <div className="grid gap-2">
            <Label id="challenge-duration">{c.duration}</Label>
            <div role="radiogroup" aria-labelledby="challenge-duration" className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={days === d}
                  onClick={() => setDays(d)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition",
                    days === d ? "border-foreground/40 bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {c.days(d)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{c.yourHabit}</Label>
            {habits.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.pacts.noHabits}</p>
            ) : (
              <HabitPicker habits={habits} value={habitId} onChange={setHabitId} label={c.yourHabit} />
            )}
          </div>

          <div className="grid gap-2">
            <Label>
              {c.who} <span className="font-normal text-muted-foreground">({invitees.length}/5)</span>
            </Label>
            {people.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.noFriends}</p>
            ) : (
              <ul className="grid gap-1.5">
                {people.map((p) => {
                  const on = invitees.includes(p.id)
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(p.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition",
                          on ? "border-emerald-500/50 bg-emerald-500/5" : "hover:bg-muted"
                        )}
                      >
                        <Avatar className="size-8">
                          {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
                          <AvatarFallback className="text-xs">{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
                        </span>
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full border",
                            on && "border-transparent bg-emerald-500 text-white"
                          )}
                        >
                          {on && <CheckIcon className="size-3.5" strokeWidth={3} />}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending || !title.trim() || !habitId || invitees.length === 0}>
              {c.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
