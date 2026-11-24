"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon } from "lucide-react"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { createHabit, updateHabit } from "@/app/actions/habits"
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
  const { t } = useI18n()
  const [pending, startTransition] = useTransition()
  const form = useForm<HabitInput>({
    resolver: zodResolver(habitSchema),
    values: {
      name: habit?.name ?? "",
      description: habit?.description ?? "",
      mini_label: habit?.mini_label ?? "",
      color: (habit?.color as HabitColor) ?? "emerald",
      target_per_week: habit?.target_per_week ?? 7,
    },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = habit ? await updateHabit(habit.id, values) : await createHabit(values)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(habit ? t.habit.updated : t.habit.created)
      form.reset()
      onOpenChange(false)
    })
  })

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
