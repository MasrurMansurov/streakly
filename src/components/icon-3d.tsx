import Image from "next/image"
import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

/** Microsoft Fluent Emoji 3D (MIT), see public/3d/LICENSE.txt */
export type Icon3DName =
  | "archive"
  | "bell"
  | "calendar"
  | "chart"
  | "check"
  | "crown"
  | "envelope"
  | "fire"
  | "globe"
  | "lightning"
  | "locked"
  | "medal"
  | "memo"
  | "moon"
  | "party"
  | "people"
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
      src={`/3d/${name}.png`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      className={cn("shrink-0 select-none", className)}
      style={style}
    />
  )
}
