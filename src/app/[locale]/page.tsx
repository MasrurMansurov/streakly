import type { Metadata } from "next"
import {
  CalendarCheck2Icon,
  CheckIcon,
  FlameIcon,
  HandshakeIcon,
  LightbulbIcon,
  LockKeyholeIcon,
  SnowflakeIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react"

import { JsonLd } from "@/components/json-ld"
import { Link } from "@/components/link"
import { TryDemoButton } from "@/components/try-demo-button"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { indexableMetadata, SITE_URL } from "@/lib/seo"
import { cn } from "@/lib/utils"

const FEATURE_ICONS: LucideIcon[] = [CalendarCheck2Icon, SnowflakeIcon, HandshakeIcon, LightbulbIcon, TrophyIcon, LockKeyholeIcon]

// the preview's habit colors (emerald, sky, rose) and a fixed last-7-days pattern
const PREVIEW_COLORS = ["bg-emerald-500", "bg-sky-500", "bg-rose-500"]
const PREVIEW_SOFT = ["bg-emerald-500/60", "bg-sky-500/60", "bg-rose-500/60"]
const WEEK = [true, true, false, true, true, true, false]

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT()
  return { title: { absolute: t.meta.title }, description: t.meta.description, ...indexableMetadata(locale, "") }
}

const AUTHOR = {
  linkedin: "https://www.linkedin.com/in/masrur-mansurov/",
  github: "https://github.com/MasrurMansurov",
}

const LinkedinMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
  </svg>
)
const GithubMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
    <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3Z" />
  </svg>
)

/** Who and what this site is, for search engines (no invented ratings — WebApplication with a free offer). */
function landingJsonLd(locale: string, description: string) {
  const url = `${SITE_URL}/${locale}`
  const author = { "@type": "Person", name: "Masrur Mansurov", url: AUTHOR.github, sameAs: [AUTHOR.linkedin, AUTHOR.github] }
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "Streakly", inLanguage: ["en", "ru"] },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: "Streakly",
        url,
        description,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web, Android, iOS, Windows, macOS, Linux",
        browserRequirements: "Requires JavaScript. Installable as a PWA.",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        inLanguage: locale,
        author,
        sameAs: ["https://github.com/MasrurMansurov/streakly"],
      },
    ],
  }
}

export default async function Home() {
  const { locale, t } = await getT()
  return (
    <>
      <JsonLd data={landingJsonLd(locale, t.meta.description)} />
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-12 px-4 py-20 md:grid-cols-[1.1fr_1fr] md:items-center md:py-28">
          <div className="grid gap-6">
            {/* no entrance animation on the hero text: it is the LCP element and must paint immediately */}
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-[3.25rem]">
              {t.landing.titleStart} {t.landing.titleAccent}.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">{t.landing.subtitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" className="h-11 px-5" render={<Link href="/login" />}>
                {t.landing.getStarted}
              </Button>
              <TryDemoButton />
            </div>
            <p className="text-sm text-muted-foreground">{t.landing.badge}</p>
          </div>

          {/* product preview: what the Today screen actually looks like */}
          <div aria-hidden className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{t.landing.previewTitle}</span>
              <span className="text-xs text-muted-foreground">{t.landing.previewLeft}</span>
            </div>
            <ul className="mt-4 divide-y">
              {t.landing.previewHabits.map((h, i) => (
                <li key={h.name} className="flex items-center gap-3 py-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                      h.done ? cn("border-transparent text-white", PREVIEW_COLORS[i]) : "border-muted-foreground/30"
                    )}
                  >
                    {h.done && <CheckIcon className="size-4" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{h.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FlameIcon className="size-3 text-orange-500" /> {h.meta}
                    </span>
                  </span>
                  <span className="hidden gap-1 sm:flex">
                    {WEEK.map((on, d) => (
                      <span key={d} className={cn("size-3 rounded-sm", on || (h.done && d === 6) ? PREVIEW_SOFT[i] : "bg-muted")} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="border-t">
          <div className="mx-auto grid max-w-5xl gap-x-10 gap-y-12 px-4 py-20 sm:grid-cols-2 lg:grid-cols-3">
            {t.landing.features.map(({ title, text }, i) => {
              const Icon = FEATURE_ICONS[i]
              return (
                <div key={title} className="grid gap-2">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <Icon className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden /> {title}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="compare-title" className="border-t">
          <div className="mx-auto grid max-w-3xl gap-6 px-4 py-20">
            <div className="grid gap-2">
              <h2 id="compare-title" className="text-2xl font-semibold tracking-tight text-balance">
                {t.landing.compareTitle}
              </h2>
              <p className="text-muted-foreground">{t.landing.compareLead}</p>
            </div>
            {/* phones: one card per row, Streakly's answer first (a table would hide that column off-screen) */}
            <ul className="grid gap-2 sm:hidden">
              {t.landing.compareRows.map((row) => (
                <li key={row.label} className="grid gap-1.5 rounded-xl border p-4 text-sm">
                  <span className="font-medium">{row.label}</span>
                  <span className="inline-flex items-start gap-1.5">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <span>
                      <span className="sr-only">{t.landing.compareUs}: </span>
                      {row.us}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.landing.compareThem}: {row.them}
                  </span>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-hidden rounded-xl border sm:block">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-1/3 px-4 py-2.5 font-medium">
                      <span className="sr-only">{t.landing.compareTitle}</span>
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">{t.landing.compareThem}</th>
                    <th scope="col" className="px-4 py-2.5 font-medium text-foreground">{t.landing.compareUs}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {t.landing.compareRows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row" className="px-4 py-3 text-left font-medium">{row.label}</th>
                      <td className="px-4 py-3 text-muted-foreground">{row.them}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-start gap-1.5">
                          <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                          {row.us}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-title" className="border-t">
          <div className="mx-auto grid max-w-3xl gap-6 px-4 py-20">
            <h2 id="faq-title" className="text-2xl font-semibold tracking-tight">
              {t.landing.faqTitle}
            </h2>
            <div className="divide-y rounded-xl border">
              {t.landing.faq.map(({ q, a }) => (
                <details key={q} className="group px-4 py-3 open:pb-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto grid max-w-3xl justify-items-center gap-4 px-4 py-20 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">{t.landing.ctaTitle}</h2>
            <p className="max-w-md text-muted-foreground">{t.landing.ctaText}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" className="h-11 px-5" render={<Link href="/login?signup=1" />}>
                {t.landing.getStarted}
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-5" render={<Link href="/demo" />}>
                {t.demo.try}
              </Button>
            </div>
          </div>
        </section>

        <section aria-labelledby="author-title" className="border-t">
          <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-14 sm:flex-row sm:items-start">
            {/* initials until there's a photo (the GitHub avatar is a plain black square) */}
            <span
              aria-hidden
              className="flex size-16 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-lg font-semibold text-white"
            >
              MM
            </span>
            <div className="grid gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.author.eyebrow}</p>
              <h2 id="author-title" className="text-lg font-semibold">
                {t.author.name} <span className="font-normal text-muted-foreground">· {t.author.role}</span>
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{t.author.text}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" render={<a href={AUTHOR.linkedin} target="_blank" rel="noopener me" />}>
                  <LinkedinMark /> {t.author.linkedin}
                </Button>
                <Button variant="outline" size="sm" render={<a href={AUTHOR.github} target="_blank" rel="noopener me" />}>
                  <GithubMark /> {t.author.github}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
