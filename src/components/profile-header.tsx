import { FlameIcon, LinkIcon, PinIcon } from "lucide-react"
import type { ReactNode } from "react"

import { AchievementBadge } from "@/components/achievement-badge"
import type { AchievementId } from "@/lib/achievements"
import { habitColor } from "@/lib/habit-colors"
import { ACCENTS, asAccent, asBanner, asFrame, BANNERS, linkLabel } from "@/lib/profile-style"
import { cn } from "@/lib/utils"

export type ProfileLook = {
  name: string
  username: string
  avatarUrl: string | null
  bio: string | null
  status: string | null
  pronouns: string | null
  banner: string
  bannerUrl: string | null
  accent: string
  avatarFrame: string
  links: string[]
  showcase: { id: AchievementId; name: string }[]
  featured: { name: string; color: string; streak: string } | null
}

type Props = {
  look: ProfileLook
  /** "Member since …" */
  subtitle?: string
  labels: { featured: string; links: string }
  /** e.g. the follow button */
  action?: ReactNode
  /** smaller variant for the settings preview */
  compact?: boolean
}

/** Discord-style profile header: banner, framed avatar, status, badges, pinned habit, links. */
export function ProfileHeader({ look, subtitle, labels, action, compact }: Props) {
  const accent = ACCENTS[asAccent(look.accent)]
  const frame = asFrame(look.avatarFrame)
  const initials = look.name.slice(0, 2).toUpperCase()
  const avatarSize = compact ? 72 : 96

  const frameStyle: React.CSSProperties =
    frame === "ring"
      ? { boxShadow: `0 0 0 3px var(--card), 0 0 0 6px ${accent}` }
      : frame === "glow"
        ? { boxShadow: `0 0 0 3px var(--card), 0 0 0 5px ${accent}, 0 0 28px 6px ${accent}80` }
        : frame === "gradient"
          ? { background: `conic-gradient(from 210deg, ${accent}, #fbbf24, #f43f5e, #8b5cf6, ${accent})`, padding: 4 }
          : { boxShadow: "0 0 0 4px var(--card)" }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card" style={{ "--accent-color": accent } as React.CSSProperties}>
      {/* banner */}
      <div
        className={cn("relative bg-cover bg-center", compact ? "h-20" : "h-28 sm:h-36")}
        style={look.bannerUrl ? { backgroundImage: `url("${look.bannerUrl}")` } : { background: BANNERS[asBanner(look.banner)] }}
        aria-hidden
      />

      <div className={cn("relative px-4 pb-4 sm:px-6", compact ? "pb-4" : "sm:pb-6")}>
        <div className="flex items-end justify-between gap-3">
          <div
            className="relative shrink-0 rounded-full bg-card"
            style={{ width: avatarSize, height: avatarSize, marginTop: -avatarSize / 2, ...frameStyle }}
          >
            {look.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, already sized
              <img src={look.avatarUrl} alt="" className="size-full rounded-full object-cover" />
            ) : (
              <span
                className="flex size-full items-center justify-center rounded-full text-xl font-semibold text-white"
                style={{ background: accent }}
              >
                {initials}
              </span>
            )}
          </div>
          {action && <div className="mt-3 flex shrink-0 gap-2">{action}</div>}
        </div>

        <div className="mt-3 grid gap-3">
          <div className="min-w-0">
            <h1 className={cn("truncate font-semibold tracking-tight", compact ? "text-lg" : "text-2xl")}>
              {look.name}
              {look.pronouns && <span className="ml-2 align-middle font-sans text-sm font-normal text-muted-foreground">{look.pronouns}</span>}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              @{look.username}
              {subtitle && ` · ${subtitle}`}
            </p>
          </div>

          {look.status && (
            <p className="flex w-fit max-w-full items-center gap-2 rounded-full border px-3 py-1 text-sm">
              <span className="size-2 shrink-0 rounded-full" style={{ background: accent }} aria-hidden />
              <span className="truncate">{look.status}</span>
            </p>
          )}

          {look.bio && <p className="text-sm leading-relaxed">{look.bio}</p>}

          {(look.showcase.length > 0 || look.featured) && (
            <div className="flex flex-wrap items-center gap-3">
              {look.showcase.length > 0 && (
                <ul className="flex gap-1.5" aria-label="Badges">
                  {look.showcase.map((b) => (
                    <li key={b.id} title={b.name}>
                      <AchievementBadge id={b.id} size={34} />
                      <span className="sr-only">{b.name}</span>
                    </li>
                  ))}
                </ul>
              )}
              {look.featured && (
                <span
                  className="inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: `${accent}66` }}
                >
                  <PinIcon className="size-3.5 shrink-0" style={{ color: accent }} aria-label={labels.featured} />
                  <span className={cn("size-2 shrink-0 rounded-full", habitColor(look.featured.color).dot)} />
                  <span className="truncate font-medium">{look.featured.name}</span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-muted-foreground">
                    <FlameIcon className="size-3.5 text-orange-500" /> {look.featured.streak}
                  </span>
                </span>
              )}
            </div>
          )}

          {look.links.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={labels.links}>
              {look.links.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="nofollow noopener noreferrer ugc"
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs transition hover:text-foreground"
                  >
                    <LinkIcon className="size-3" style={{ color: accent }} /> {linkLabel(url)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
