import { ArchiveIcon, ChevronRightIcon, ExternalLinkIcon, SettingsIcon, SparklesIcon, type LucideIcon } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { Link } from "@/components/link"
import { SignOutButton } from "@/components/sign-out-button"
import { Skeleton } from "@/components/ui/skeleton"
import { getT } from "@/i18n/server"
import { getArchivedCount, getToday, requireUser } from "@/lib/data"
import { initials } from "@/lib/initials"
import { REPO_URL } from "@/lib/seo"
import { createClient } from "@/lib/supabase/server"
import { isWrappedSeason } from "@/lib/wrapped-season"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.me.title }
}

/**
 * Profile: everything personal and occasional in one list — the phone's fourth
 * tab, the same items as the avatar menu on desktop. A plain list, no tiles.
 */
export default async function MePage() {
  const { t } = await getT()
  return (
    <div className="mx-auto grid max-w-2xl gap-8">
      <h1 className="sr-only">{t.me.title}</h1>
      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <Hub />
      </Suspense>
    </div>
  )
}

function Row({ href, icon: Icon, label, hint, external }: { href: string; icon?: LucideIcon; label: string; hint?: string; external?: boolean }) {
  const body = (
    <>
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      {external ? (
        <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : (
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </>
  )
  const cls = "flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/60"
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noreferrer" className={cls}>
          {body}
        </a>
      ) : (
        <Link href={href} className={cls}>
          {body}
        </Link>
      )}
    </li>
  )
}

async function Hub() {
  const user = await requireUser()
  const supabase = await createClient()
  const [{ t }, { today }, archived, { data: profile }, { count: highFives }, { count: spareRepairs }] = await Promise.all([
    getT(),
    getToday(),
    getArchivedCount(user.id),
    supabase.from("profiles").select("username, display_name, is_public, avatar_url").eq("id", user.id).single(),
    supabase.from("cheers").select("id", { count: "exact", head: true }).eq("to_id", user.id).eq("kind", "high_five"),
    supabase.from("streak_gifts").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("used_at", null),
  ])
  const name = profile?.display_name || profile?.username || ""

  return (
    <>
      {!user.isGuest && profile && (
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, already sized
            <img src={profile.avatar_url} alt="" className="size-12 rounded-full object-cover" />
          ) : (
            <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-muted font-semibold">
              {initials(name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{name}</p>
            <p className="truncate text-sm text-muted-foreground">
              @{profile.username}
              {user.email && ` · ${user.email}`}
            </p>
            {Boolean(highFives) && <p className="text-sm text-muted-foreground tabular-nums">{t.cheers.received(highFives!)}</p>}
            {Boolean(spareRepairs) && <p className="text-sm text-muted-foreground tabular-nums">{t.me.spareRepairs(spareRepairs!)}</p>}
          </div>
        </div>
      )}

      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {!user.isGuest && profile && (
          <Row
            href={profile.is_public ? `/u/${profile.username}` : "/settings#profile"}
            icon={ExternalLinkIcon}
            label={t.nav.publicProfile}
            hint={profile.is_public ? t.me.publicOn : t.me.publicOff}
          />
        )}
        <Row href="/archive" icon={ArchiveIcon} label={t.nav.archive} hint={t.me.archived(archived)} />
        <Row href="/settings" icon={SettingsIcon} label={t.nav.settings} hint={t.me.settingsHint} />
        {isWrappedSeason(today) && <Row href="/wrapped" icon={SparklesIcon} label={t.me.yearInReview} />}
      </ul>

      <section aria-labelledby="me-tools" className="grid gap-2">
        <h2 id="me-tools" className="px-1 text-sm text-muted-foreground">
          {t.me.tools}
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          <Row href="/templates" label={t.guides.link} />
          <Row href="/habit-tracker-printable" label={t.printable.link} />
          <Row href="/year-in-pixels" label={t.pixels.link} />
          {/* the landing page on purpose: "?home" skips the signed-in redirect */}
          <Row href="/?home" label={t.me.about} />
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <SignOutButton />
        <p className="flex gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            {t.legal.privacy}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t.legal.terms}
          </Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
            GitHub
          </a>
        </p>
      </div>
    </>
  )
}
