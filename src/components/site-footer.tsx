import { Link } from "@/components/link"
import { LogoMark } from "@/components/logo"
import { getT } from "@/i18n/server"
import { REPO_URL } from "@/lib/seo"

const GITHUB = REPO_URL

/**
 * One footer for the whole site. `full` on public pages: the product pages,
 * then the fine print. `compact` inside the app: the free tools and the fine
 * print on one line (the sections themselves are in the main navigation).
 */
export async function SiteFooter({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { t } = await getT()
  const link = "hover:text-foreground"
  const tools = (
    <>
      <Link href="/templates" className={link}>
        {t.guides.link}
      </Link>
      <Link href="/habit-tracker-printable" className={link}>
        {t.printable.link}
      </Link>
      <Link href="/year-in-pixels" className={link}>
        {t.pixels.link}
      </Link>
    </>
  )
  const fine = (
    <>
      <Link href="/privacy" className={link}>
        {t.legal.privacy}
      </Link>
      <Link href="/terms" className={link}>
        {t.legal.terms}
      </Link>
      <a href={GITHUB} target="_blank" rel="noreferrer" className={link}>
        GitHub
      </a>
    </>
  )

  if (variant === "compact") {
    return (
      // phones have all of this in the Profile tab, right above the tab bar
      <footer className="border-t py-6 max-md:hidden">
        <nav aria-label={t.nav.site} className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-2 px-4 text-xs text-muted-foreground">
          {tools}
          {fine}
        </nav>
      </footer>
    )
  }

  return (
    <footer className="border-t py-8">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 text-xs text-muted-foreground sm:grid-cols-[auto_1fr] sm:items-start sm:gap-10">
        <Link href="/" className="flex items-center gap-2 hover:text-foreground">
          <LogoMark size={18} /> Streakly
        </Link>
        <nav aria-label={t.nav.site} className="grid gap-2 sm:justify-items-end">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/demo" className={link}>
              {t.demoPage.link}
            </Link>
            {tools}
            <Link href="/leaderboard" className={link}>
              {t.nav.leaderboard}
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">{fine}</div>
        </nav>
      </div>
    </footer>
  )
}
