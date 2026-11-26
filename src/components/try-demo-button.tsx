"use client"

import { PlayIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { startDemo, type DemoSource } from "@/app/actions/demo"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"
import { cn } from "@/lib/utils"

/** "Try without signing up": a temporary guest with two months of sample habits. */
export function TryDemoButton({
  variant = "outline",
  className,
  source,
}: {
  variant?: "outline" | "ghost" | "default"
  className?: string
  /** where the demo was started (analytics: hero / demo page / sign-in) */
  source?: DemoSource
}) {
  const { t } = useI18n()
  const [pending, start] = useTransition()
  return (
    <Button
      size="lg"
      variant={variant}
      className={cn("h-11 px-5", className)}
      disabled={pending}
      title={t.demo.tryHint}
      onClick={() =>
        start(async () => {
          // success redirects to the Today screen; we only get here on error
          const res = await startDemo(source)
          if (!res.ok) toast.error(res.error)
        })
      }
    >
      <PlayIcon aria-hidden /> {pending ? t.common.pleaseWait : t.demo.try}
    </Button>
  )
}
