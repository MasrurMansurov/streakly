import { FlameIcon } from "lucide-react"
import { Link } from "@/components/link"

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500 text-white">
        <FlameIcon className="size-4" />
      </span>
      Streakly
    </Link>
  )
}
