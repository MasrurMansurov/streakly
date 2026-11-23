import { Icon3D } from "@/components/icon-3d"
import { Link } from "@/components/link"

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-1.5 font-semibold tracking-tight">
      <Icon3D name="fire" size={28} eager className="transition-transform group-hover:-rotate-12 group-hover:scale-110" />
      Streakly
    </Link>
  )
}
