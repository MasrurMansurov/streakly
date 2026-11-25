"use client"

import { useEffect } from "react"

/**
 * iOS Safari doesn't shrink 100dvh when the keyboard opens, so a centered
 * dialog ends up with its Save button under the keyboard. This exposes the
 * part of the screen that is really visible as CSS variables:
 *   --vvh: its height, --vvt: its offset from the top.
 * Dialogs size and center themselves on them (fallback: 100dvh / 0).
 */
export function VisualViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      root.style.setProperty("--vvh", `${vv.height}px`)
      root.style.setProperty("--vvt", `${vv.offsetTop}px`)
    }
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])
  return null
}
