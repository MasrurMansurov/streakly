"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Horizontal scroller that starts scrolled to the right (latest data first on small screens). */
export function ScrollToEnd({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])
  return (
    <div ref={ref} className={cn("overflow-x-auto", className)}>
      {children}
    </div>
  )
}
