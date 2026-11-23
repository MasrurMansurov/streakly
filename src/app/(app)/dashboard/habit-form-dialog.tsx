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
import { cn } from "@/lib/utils"
import { habitSchema, type HabitInput } from "@/lib/validation"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** edit mode when provided */
  habit?: Habit
}

export function HabitFormDialog({ open, onOpenChange, habit }: Props) {
  const [pending, startTransition] = useTransition()
  const form = useForm<HabitInput>({
    resolver: zodResolver(habitSchema),
    values: {
      name: habit?.name ?? "",
      description: habit?.description ?? "",
      color: (habit?.color as HabitColor) ?? "emerald",
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
      toast.success(habit ? "Habit updated" : "Habit created")
      form.reset()
      onOpenChange(false)
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{habit ? "Edit habit" : "New habit"}</DialogTitle>
            <DialogDescription>Small, daily and specific works best.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="habit-name">Name</Label>
            <Input
              id="habit-name"
              placeholder="Read 10 pages"
              autoFocus
              aria-invalid={!!errors.name}
              {...form.register("name")}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="habit-description">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="habit-description"
              rows={2}
              placeholder="Before bed, any book"
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <Controller
              control={form.control}
              name="color"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Color" className="flex gap-2">
                  {HABIT_COLOR_NAMES.map((c) => {
                    const selected = field.value === c
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={c}
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
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : habit ? "Save" : "Create habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
