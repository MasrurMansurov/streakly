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

/** Who and what this site is, for search engines (no invented ratings — WebApplication with a free offer). */
function landingJsonLd(locale: string, description: string) {
  const url = `${SITE_URL}/${locale}`
  const author = { "@type": "Person", name: "Masrur Mansurov", url: "https://github.com/MasrurMansurov" }
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
      </main>
      <SiteFooter />
    </>
  )
}
