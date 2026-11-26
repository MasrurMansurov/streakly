import type { Metadata } from "next"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { LEGAL, LEGAL_UPDATED, CONTACT_URL, type LegalKind } from "@/content/legal"
import { formatDay } from "@/i18n"
import { getT } from "@/i18n/server"
import type { ISODate } from "@/lib/dates"
import { indexableMetadata } from "@/lib/seo"

export async function legalMetadata(kind: LegalKind): Promise<Metadata> {
  const { locale } = await getT()
  const doc = LEGAL[kind][locale]
  return { title: doc.title, description: doc.intro, ...indexableMetadata(locale, `/${kind}`) }
}

/** Privacy policy / terms: a calm, readable long-form page. */
export async function LegalPage({ kind }: { kind: LegalKind }) {
  const { locale, t } = await getT()
  const doc = LEGAL[kind][locale]
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <article className="mx-auto grid max-w-2xl gap-8 px-4 py-14">
          <header className="grid gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
            <p className="text-sm text-muted-foreground">
              {doc.updated}: <time dateTime={LEGAL_UPDATED}>{formatDay(locale, LEGAL_UPDATED as ISODate, { year: "numeric", month: "long", day: "numeric" })}</time>
            </p>
            <p className="leading-relaxed text-muted-foreground">{doc.intro}</p>
          </header>
          {doc.sections.map((s) => (
            <section key={s.heading} className="grid gap-3">
              <h2 className="text-lg font-semibold">{s.heading}</h2>
              {s.items && (
                <ul className="grid list-disc gap-2 pl-5 leading-relaxed marker:text-emerald-500">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {s.paragraphs?.map((p) => (
                <p key={p} className="leading-relaxed">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <p className="rounded-xl border bg-card p-4 text-sm">
            {t.legal.contact}{" "}
            <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-400">
              GitHub Issues
            </a>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  )
}
