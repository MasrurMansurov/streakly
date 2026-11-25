"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { BellIcon, CheckIcon } from "lucide-react"
import { useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { createHabit, updateHabit } from "@/app/actions/habits"
import { turnOnReminders } from "@/app/actions/reminders"
import { browserTimezone } from "@/components/day-rollover"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Habit } from "@/lib/data"
import { HABIT_COLOR_NAMES, habitColor, type HabitColor } from "@/lib/habit-colors"
import { validationMessage } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { ensurePushOn, pushBlocker, type PushReadiness } from "@/lib/push-device"
import { cn } from "@/lib/utils"
import { habitSchema, type HabitInput } from "@/lib/validation"

const FREQUENCIES = [7, 5, 4, 3, 2, 1] as const

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** edit mode when provided */
  habit?: Habit
}

export function HabitFormDialog({ open, onOpenChange, habit }: Props) {
  const { locale, t } = useI18n()
  const [pending, startTransition] = useTransition()
  const form = useForm<HabitInput>({
    resolver: zodResolver(habitSchema),
    values: {
      name: habit?.name ?? "",
      description: habit?.description ?? "",
      mini_label: habit?.mini_label ?? "",
      cue: habit?.cue ?? "",
      remind_at: habit?.remind_at ?? "",
      color: (habit?.color as HabitColor) ?? "emerald",
      target_per_week: habit?.target_per_week ?? 7,
    },
  })
  const { errors } = form.formState
  const remindAt = useWatch({ control: form.control, name: "remind_at" })

  const onSubmit = form.handleSubmit((values) => {
    // a habit with a reminder time must actually be able to reach this device
    const wantsPush = Boolean(values.remind_at)
    // browsers only show the permission prompt right after a click: ask now, before any await
    const permission =
      wantsPush && pushBlocker() === null && Notification.permission === "default" ? Notification.requestPermission() : null
    startTransition(async () => {
      const res = habit ? await updateHabit(habit.id, values) : await createHabit(values)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(habit ? t.habit.updated : t.habit.created)
      form.reset()
      onOpenChange(false)
      if (!wantsPush) return
      await permission?.catch(() => null)
      const ready = await ensurePushOn(() => turnOnReminders({ timezone: browserTimezone(), locale }))
      notifyPush(ready, values.remind_at ?? "")
    })
  })

  const notifyPush = (ready: PushReadiness, time: string) => {
    if (ready === "ok") return void toast.success(t.habitForm.pushOn(time))
    const why =
      ready === "ios-install"
        ? t.reminders.iosInstall
        : ready === "unsupported"
          ? t.reminders.unsupported
          : ready === "denied"
            ? t.reminders.denied
            : t.habitForm.pushFailed
    toast.warning(t.habitForm.pushNotReady, { description: why, duration: 12_000 })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{habit ? t.habitForm.editTitle : t.habitForm.newTitle}</DialogTitle>
            <DialogDescription>{t.habitForm.hint}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="habit-name">{t.habitForm.name}</Label>
            <Input
              id="habit-name"
              placeholder={t.habitForm.namePlaceholder}
              autoFocus
              aria-invalid={!!errors.name}
              {...form.register("name")}
            />
            {errors.name && <p className="text-xs text-destructive">{validationMessage(t, errors.name.message)}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="habit-description">
              {t.habitForm.description} <span className="font-normal text-muted-foreground">{t.habitForm.optional}</span>
            </Label>
            <Textarea
              id="habit-description"
              rows={2}
              placeholder={t.habitForm.descriptionPlaceholder}
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
            {errors.description && <p className="text-xs text-destructive">{validationMessage(t, errors.description.message)}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="habit-cue">
              {t.habitForm.cue} <span className="font-normal text-muted-foreground">{t.habitForm.optional}</span>
            </Label>
            <Input
              id="habit-cue"
              placeholder={t.habitForm.cuePlaceholder}
              aria-invalid={!!errors.cue}
              aria-describedby="habit-cue-hint"
              {...form.register("cue")}
            />
            <div className="flex flex-wrap gap-1.5">
              {t.habitForm.cueSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => form.setValue("cue", s, { shouldDirty: true, shouldValidate: true })}
                  className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            <p id="habit-cue-hint" className="text-xs text-muted-foreground">
              {t.habitForm.cueHint}
            </p>
            {errors.cue && <p className="text-xs text-destructive">{validationMessage(t, errors.cue.message)}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="habit-remind">
              {t.habitForm.remindAt} <span className="font-normal text-muted-foreground">{t.habitForm.optional}</span>
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative w-36">
                <BellIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="habit-remind"
                  type="time"
                  step={900}
                  className="pl-8"
                  aria-invalid={!!errors.remind_at}
                  aria-describedby="habit-remind-hint"
                  {...form.register("remind_at")}
                />
              </div>
              {remindAt && (
                <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("remind_at", "", { shouldDirty: true })}>
                  {t.habitForm.clearTime}
                </Button>
              )}
            </div>
            <p id="habit-remind-hint" className="text-xs text-muted-foreground">
              {t.habitForm.remindAtHint} {remindAt && t.habitForm.remindAtNeedsPush}
            </p>
            {errors.remind_at && <p className="text-xs text-destructive">{validationMessage(t, errors.remind_at.message)}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="habit-mini">
              {t.habitForm.mini} <span className="font-normal text-muted-foreground">{t.habitForm.optional}</span>
            </Label>
            <Input
              id="habit-mini"
              placeholder={t.habitForm.miniPlaceholder}
              aria-invalid={!!errors.mini_label}
              aria-describedby="habit-mini-hint"
              {...form.register("mini_label")}
            />
            <p id="habit-mini-hint" className="text-xs text-muted-foreground">
              {t.habitForm.miniHint}
            </p>
            {errors.mini_label && <p className="text-xs text-destructive">{validationMessage(t, errors.mini_label.message)}</p>}
          </div>

          <div className="grid gap-2">
            <Label id="habit-frequency">{t.habitForm.howOften}</Label>
            <Controller
              control={form.control}
              name="target_per_week"
              render={({ field }) => (
                <div role="radiogroup" aria-labelledby="habit-frequency" className="flex flex-wrap gap-1.5">
                  {FREQUENCIES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === value}
                      aria-label={t.habitForm.frequencyAria(value)}
                      onClick={() => field.onChange(value)}
                      className={cn(
                        "h-8 rounded-lg border px-2.5 text-sm transition",
                        field.value === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {t.habitForm.frequency[value]}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t.habitForm.color}</Label>
            <Controller
              control={form.control}
              name="color"
              render={({ field }) => (
                <div role="radiogroup" aria-label={t.habitForm.color} className="flex gap-2">
                  {HABIT_COLOR_NAMES.map((c) => {
                    const selected = field.value === c
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={t.habitForm.colors[c] ?? c}
                        onClick={() => field.onChange(c)}
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background transition",
                          habitColor(c).dot,
                          selected && cn("ring-2", habitColor(c).ring)
                        )}
                      >
                        {selected && <CheckIcon className="size-4" />}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t.common.saving : habit ? t.common.save : t.habitForm.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
