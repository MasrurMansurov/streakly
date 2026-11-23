import Image from "next/image"
import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

/** Custom clay-style 3D icons made for Streakly (generated with Canva AI, cut out locally). */
export type Icon3DName =
  | "archive"
  | "bell"
  | "calendar"
  | "chart"
  | "check"
  | "crown"
  | "envelope"
  | "fire"
  | "gift"
  | "heart"
  | "lightning"
  | "locked"
  | "medal"
  | "megaphone"
  | "memo"
  | "moon"
  | "people"
  | "rocket"
  | "seedling"
  | "shield"
  | "sparkles"
  | "sun"
  | "sunrise"
  | "sunset"
  | "target"
  | "trophy"

type Props = {
  name: Icon3DName
  size?: number
  className?: string
  /** decorative by default */
  alt?: string
  /** above-the-fold icons: load immediately instead of lazily */
  eager?: boolean
  style?: CSSProperties
}

export function Icon3D({ name, size = 24, className, alt = "", eager, style }: Props) {
  return (
    <Image
      src={`/clay/${name}.png`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      // the renders were cut out without their floor shadow; a soft CSS shadow gives depth back
      className={cn("shrink-0 select-none drop-shadow-[0_4px_6px_rgb(0_0_0/0.15)]", className)}
      style={style}
    />
  )
}
