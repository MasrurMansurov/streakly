"use client"

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react"
import { useFieldArray, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validationMessage } from "@/i18n"
import { useI18n } from "@/i18n/client"
import { MAX_STEPS, type HabitInput } from "@/lib/validation"

/** Optional steps of a habit ("water → stretch → shower"), in order. */
export function StepsField({
  control,
  register,
  errors,
}: {
  control: Control<HabitInput>
  register: UseFormRegister<HabitInput>
  errors: FieldErrors<HabitInput>
}) {
  const { t } = useI18n()
  // keyName "key": a step's own `id` (from the database) must survive edits
  const { fields, append, remove, move } = useFieldArray({ control, name: "steps", keyName: "key" })

  return (
    <div className="grid gap-2">
      <Label id="habit-steps">
        {t.steps.label} <span className="font-normal text-muted-foreground">{t.habitForm.optional}</span>
      </Label>
      <p id="habit-steps-hint" className="text-xs text-muted-foreground">
        {t.steps.hint}
      </p>
      {fields.length > 0 && (
        <ol aria-labelledby="habit-steps" className="grid gap-1.5">
          {fields.map((field, i) => {
            const title = field.title || t.steps.placeholder(i + 1)
            const error = errors.steps?.[i]?.title
            return (
              <li key={field.key} className="grid gap-1">
                <div className="flex items-center gap-1">
                  <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums" aria-hidden>
                    {i + 1}.
                  </span>
                  <Input
                    aria-label={t.steps.placeholder(i + 1)}
                    aria-describedby="habit-steps-hint"
                    aria-invalid={!!error}
                    placeholder={t.steps.placeholder(i + 1)}
                    maxLength={80}
                    className="min-w-0 flex-1"
                    {...register(`steps.${i}.title`)}
                  />
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} aria-label={t.steps.moveUp(title)} onClick={() => move(i, i - 1)}>
                    <ArrowUpIcon aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === fields.length - 1}
                    aria-label={t.steps.moveDown(title)}
                    onClick={() => move(i, i + 1)}
                  >
                    <ArrowDownIcon aria-hidden />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t.steps.remove(title)} onClick={() => remove(i)}>
                    <XIcon aria-hidden />
                  </Button>
                </div>
                {error && <p className="pl-6 text-xs text-destructive">{validationMessage(t, error.message)}</p>}
              </li>
            )
          })}
        </ol>
      )}
      {errors.steps?.root && <p className="text-xs text-destructive">{validationMessage(t, errors.steps.root.message)}</p>}
      {fields.length < MAX_STEPS && (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => append({ title: "" }, { shouldFocus: true })}>
          <PlusIcon aria-hidden /> {t.steps.add}
        </Button>
      )}
    </div>
  )
}
