"use client"

import { useMemo, useSyncExternalStore } from "react"

const COLORS = ["#10b981", "#f59e0b", "#f43f5e", "#0ea5e9", "#8b5cf6", "#facc15"]

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

/**
 * A small one-shot burst of particles around its parent (which must be `relative`).
 * Re-mount it (change `key`) to play again. Renders nothing for reduced motion.
 */
export function ConfettiBurst({ count = 14, distance = 30 }: { count?: number; distance?: number }) {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true
  )
  // deterministic per mount (no Math.random during render)
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.3
        const r = distance * (0.7 + ((i * 37) % 10) / 20)
        return {
          dx: `${Math.cos(angle) * r}px`,
          dy: `${Math.sin(angle) * r}px`,
          rot: `${(i * 67) % 360}deg`,
          color: COLORS[i % COLORS.length],
          round: i % 3 === 0,
        }
      }),
    [count, distance]
  )

  if (reduced) return null
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute top-1/2 left-1/2 size-2 animate-confetti"
          style={
            {
              "--dx": p.dx,
              "--dy": p.dy,
              "--rot": p.rot,
              background: p.color,
              borderRadius: p.round ? "9999px" : "1px",
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )
}
