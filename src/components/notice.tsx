import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type Tone = "neutral" | "success" | "warning" | "info"

/** Color lives in the icon only — the surface stays neutral (no tinted boxes, no colored borders). */
const ICON_TONE: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  success: "text-done",
  warning: "text-warning",
  info: "text-info",
}

/**
 * One calm style for every inline message: a page notice (size "md") or a
 * line inside a habit card (size "sm").
 *
 *   <Notice icon={CloudOffIcon} tone="warning" title="Offline" action={<Button …/>}>3 check-ins waiting</Notice>
 */
export function Notice({
  icon: Icon,
  tone = "neutral",
  title,
  children,
  action,
  size = "md",
  role,
  className,
}: {
  icon?: LucideIcon
  tone?: Tone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  size?: "sm" | "md"
  role?: "status" | "alert"
  className?: string
}) {
  return (
    <div
      role={role}
      data-slot="notice"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 border",
        size === "md" ? "rounded-xl bg-card px-4 py-3 text-sm shadow-xs" : "rounded-lg bg-background/70 px-3 py-2 text-xs",
        className
      )}
    >
      {Icon && <Icon className={cn("shrink-0", size === "md" ? "size-4" : "size-3.5", ICON_TONE[tone])} aria-hidden />}
      {/* at least 12rem: on a phone the action wraps below instead of squeezing the text */}
      <div className="min-w-48 flex-1 leading-relaxed">
        {title && <p className="font-medium text-foreground">{title}</p>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}
