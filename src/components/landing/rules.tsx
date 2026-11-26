import { getDictionary, type Locale } from "@/i18n"
import { REPO_URL } from "@/lib/seo"
import { typo } from "@/lib/typography"
import { cn } from "@/lib/utils"

type Item = { term: string; text: string }

function List({ id, title, items, locale, muted }: { id: string; title: string; items: readonly Item[]; locale: Locale; muted?: boolean }) {
  return (
    <div className="grid content-start gap-4">
      <h3 id={id} className="text-sm font-semibold">
        {title}
      </h3>
      <dl aria-labelledby={id} className="grid gap-4">
        {items.map(({ term, text }) => (
          <div key={term} className="grid gap-1">
            <dt className="flex items-center gap-2.5 font-medium">
              <span aria-hidden className={cn("size-1.5 shrink-0 rounded-[2px]", muted ? "bg-muted-foreground/50" : "bg-done")} />
              {typo(locale, term)}
            </dt>
            <dd className="pl-4 leading-relaxed text-muted-foreground">{typo(locale, text)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * The exact rules — what Streakly does, with the conditions from the code — and
 * an honest list of what it doesn't. No competitor column, no checkmark grid.
 */
export function Rules({ locale }: { locale: Locale }) {
  const r = getDictionary(locale).landing.rules
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-20">
      <div className="grid max-w-2xl gap-2">
        <h2 id="rules-title" className="font-brand text-xl font-semibold tracking-[-0.01em] text-balance sm:text-2xl">
          {typo(locale, r.title)}
        </h2>
        <p className="text-muted-foreground">{typo(locale, r.lead)}</p>
      </div>
      <div className="grid gap-10 sm:grid-cols-[2fr_1fr] sm:gap-14">
        <List id="rules-does" title={r.doesTitle} items={r.does} locale={locale} />
        <List id="rules-not" title={r.notTitle} items={r.not} locale={locale} muted />
      </div>
      <p className="text-sm text-muted-foreground">
        {r.code}{" "}
        <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4 hover:text-primary">
          {r.codeLink}
        </a>
      </p>
    </div>
  )
}
