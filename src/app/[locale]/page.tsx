import type { Metadata } from "next"

import { JsonLd } from "@/components/json-ld"
import { Closing } from "@/components/landing/closing"
import { Rules } from "@/components/landing/rules"
import { Scenes } from "@/components/landing/scenes"
import { TodayDemo } from "@/components/landing/today-demo"
import { Link } from "@/components/link"
import { TryDemoButton } from "@/components/try-demo-button"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { AUTHOR, indexableMetadata, SITE_URL } from "@/lib/seo"
import { typo } from "@/lib/typography"


export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT()
  return { title: { absolute: t.meta.title }, description: t.meta.description, ...indexableMetadata(locale, "") }
}

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
      <main id="main" className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-12 px-4 py-20 md:grid-cols-[1.1fr_1fr] md:items-center md:py-28">
          <div className="grid gap-6">
            {/* no entrance animation on the hero text: it is the LCP element and must paint immediately */}
            <h1 className="font-brand text-[1.7rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance sm:text-[2.75rem]">
              {typo(locale, t.landing.titleStart)} <span className="text-primary">{typo(locale, t.landing.titleAccent)}</span>.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-pretty text-muted-foreground">{typo(locale, t.landing.subtitle)}</p>
            {/* trying is the low-commitment step, so it leads; the account is the second choice */}
            <div className="flex flex-wrap items-center gap-3">
              <TryDemoButton variant="default" source="hero" />
              <Button size="lg" variant="outline" className="h-11 px-5" render={<Link href="/login?signup=1" />}>
                {t.landing.createAccount}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t.landing.badge}</p>
          </div>

          {/* the product itself, live: tap to check off (the server renders the same first frame) */}
          <TodayDemo />
        </section>

        <section id="features" className="border-t">
          <Scenes locale={locale} />
        </section>

        <section aria-labelledby="also-title" className="border-t">
          <div className="mx-auto grid max-w-3xl gap-5 px-4 py-16">
            <h2 id="also-title" className="text-lg font-semibold">
              {t.landing.alsoTitle}
            </h2>
            <ul className="grid gap-2.5 text-muted-foreground">
              {t.landing.also.map((line) => (
                <li key={line} className="flex gap-3 leading-relaxed">
                  <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-[2px] bg-done" />
                  {typo(locale, line)}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              {t.landing.toolsLabel}{" "}
              <Link href="/templates" className="text-foreground underline underline-offset-4 hover:text-primary">
                {t.guides.link}
              </Link>
              {" · "}
              <Link href="/habit-tracker-printable" className="text-foreground underline underline-offset-4 hover:text-primary">
                {t.printable.link}
              </Link>
              {" · "}
              <Link href="/year-in-pixels" className="text-foreground underline underline-offset-4 hover:text-primary">
                {t.pixels.link}
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="rules-title" className="border-t">
          <Rules locale={locale} />
        </section>

        <section aria-labelledby="faq-title" className="border-t">
          <div className="mx-auto grid max-w-3xl gap-6 px-4 py-20">
            <h2 id="faq-title" className="font-brand text-xl font-semibold tracking-[-0.01em] sm:text-2xl">
              {typo(locale, t.landing.faqTitle)}
            </h2>
            <div className="divide-y rounded-xl border">
              {t.landing.faq.map(({ q, a }) => (
                <details key={q} className="group px-4 py-3 open:pb-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {typo(locale, q)}
                    <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{typo(locale, a)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="closing-title" className="border-t">
          <Closing locale={locale} />
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
