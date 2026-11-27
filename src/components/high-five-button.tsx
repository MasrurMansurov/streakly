"use client"

import { HandIcon } from "lucide-react"
import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { setHighFive } from "@/app/actions/cheers"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"
import { cn } from "@/lib/utils"

type Props = { toId: string; name: string; day: string; given: boolean }

/** "High five" for one person's check-ins on one day of the feed. Tap again to take it back. */
export function HighFiveButton({ toId, name, day, given }: Props) {
  const { t } = useI18n()
  const [on, setOn] = useOptimistic(given)
  const [, start] = useTransition()

  const toggle = () =>
    start(async () => {
      setOn(!on)
      const res = await setHighFive(toId, day, !on)
      if (!res.ok) toast.error(res.error)
    })

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-pressed={on}
      aria-label={t.cheers.highFive(name)}
      title={t.cheers.highFive(name)}
      onClick={toggle}
      className={cn(on ? "text-streak" : "text-muted-foreground")}
    >
      <HandIcon className={cn("transition-transform duration-200 ease-out", on && "-rotate-12")} fill={on ? "currentColor" : "none"} />
    </Button>
  )
}
