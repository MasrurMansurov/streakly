import { Link } from "@/components/link"
import { TryDemoButton } from "@/components/try-demo-button"
import { getDictionary, type Locale } from "@/i18n"
import { AUTHOR, REPO_URL } from "@/lib/seo"
import { typo } from "@/lib/typography"

const GithubMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
    <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3Z" />
  </svg>
)

const LinkedinMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
  </svg>
)

const textLink = "inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"

/**
 * The end of the page: a short first-person note from the maker (no avatar until
 * there's a real photo — initials read as a default placeholder), then one action.
 * Left-aligned in the page grid, no band, no gradient, no twin buttons.
 */
export function Closing({ locale }: { locale: Locale }) {
  const c = getDictionary(locale).landing.closing
  return (
    <div className="mx-auto grid max-w-3xl gap-10 px-4 pt-24 pb-20">
      <div className="grid gap-4">
        <h2 id="closing-title" className="font-brand text-xl font-semibold tracking-[-0.01em] sm:text-2xl">
          {typo(locale, c.title)}
        </h2>
        <div className="grid max-w-prose gap-3 leading-relaxed">
          {c.note.map((line) => (
            <p key={line}>{typo(locale, line)}</p>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">— {c.signature}</p>
        <div className="flex flex-wrap gap-x-6">
          <a href={REPO_URL} target="_blank" rel="noopener me" className={textLink}>
            <GithubMark /> {c.code}
          </a>
          <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noopener" className={textLink}>
            {c.issue}
          </a>
          <a href={AUTHOR.linkedin} target="_blank" rel="noopener me" className={textLink}>
            <LinkedinMark /> {c.linkedin}
          </a>
        </div>
      </div>

      <div className="grid gap-3 border-t pt-8">
        <p className="text-lg font-semibold">{typo(locale, c.ctaLine)}</p>
        <div>
          <TryDemoButton variant="default" source="landing-cta" className="w-full sm:w-auto" />
        </div>
        <p className="max-w-md text-sm text-muted-foreground">{typo(locale, c.ctaNote)}</p>
        <Link href="/login?signup=1" className="w-fit text-sm font-medium underline underline-offset-4 hover:text-primary">
          {c.signup}
        </Link>
      </div>
    </div>
  )
}
