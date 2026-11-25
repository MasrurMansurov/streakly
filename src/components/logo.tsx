import { useId } from "react"

import { Link } from "@/components/link"
import { cn } from "@/lib/utils"

/** The Streakly mark: a flame (your streak) with a check mark cut in (today's habit done). */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  // unique gradient ids, so several marks on one page don't clash
  const id = useId().replace(/:/g, "")
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id={`${id}-fl`} x1="32" y1="9" x2="32" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#ECFDF5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${id}-bg)`} />
      <path
        fill={`url(#${id}-fl)`}
        d="M32 53C23.7 53 17 46.4 17 38c0-7.4 2.4-13.4 4.5-18.5 1.5 4.9 3.5 7.9 6.1 9.3C27 20.6 29.8 13.4 34 8c1.2 6.6 5.6 10.6 9.2 15.8 2.5 3.6 3.8 7.8 3.8 12.8C47 46 40.3 53 32 53Z"
      />
      <path stroke="#059669" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" d="m24.8 38.6 5.1 5 9.4-10.4" />
    </svg>
  )
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2" aria-label="Streakly">
      <LogoMark size={30} className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-brand text-[17px] font-semibold tracking-tight lowercase">streakly</span>
    </Link>
  )
}
