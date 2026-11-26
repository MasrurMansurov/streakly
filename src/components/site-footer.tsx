import { Link } from "@/components/link"
import { LogoMark } from "@/components/logo"
import { getT } from "@/i18n/server"

export async function SiteFooter() {
  const { t } = await getT()
  return (
    <footer className="border-t py-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <LogoMark size={18} /> Streakly · {t.landing.footer}
        </span>
        <nav aria-label={t.legal.nav} className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/demo" className="hover:text-foreground">
            {t.demoPage.link}
          </Link>
          <Link href="/templates" className="hover:text-foreground">
            {t.guides.link}
          </Link>
          <Link href="/habit-tracker-printable" className="hover:text-foreground">
            {t.printable.link}
          </Link>
          <Link href="/leaderboard" className="hover:text-foreground">
            {t.nav.leaderboard}
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            {t.legal.privacy}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t.legal.terms}
          </Link>
          <a href="https://github.com/MasrurMansurov/streakly" target="_blank" rel="noreferrer" className="hover:text-foreground">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
