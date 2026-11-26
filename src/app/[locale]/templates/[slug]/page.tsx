import type { Metadata } from "next"
import { CheckIcon, ChevronRightIcon, LightbulbIcon } from "lucide-react"
import { notFound } from "next/navigation"

import { JsonLd } from "@/components/json-ld"
import { Link } from "@/components/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { GUIDE_SLUGS, GUIDES, slugToKey } from "@/content/habit-guides"
import { getT } from "@/i18n/server"
import { habitColor } from "@/lib/habit-colors"
import { indexableMetadata, SITE_URL } from "@/lib/seo"
import { HABIT_TEMPLATES } from "@/lib/templates"
import { cn } from "@/lib/utils"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return Object.values(GUIDE_SLUGS).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const key = slugToKey(slug)
  const { locale } = await getT()
  if (!key) return {}
  const g = GUIDES[key][locale]
  return { title: { absolute: g.metaTitle }, description: g.metaDescription, ...indexableMetadata(locale, `/templates/${slug}`) }
}

/** One habit guide: why, when (if-then), the mini version, steps, mistakes — and a way into the app. */
export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const key = slugToKey(slug)
  if (!key) notFound()
  const { locale, t } = await getT()
  const g = GUIDES[key][locale]
  const tpl = HABIT_TEMPLATES.find((x) => x.key === key)!
  const color = habitColor(tpl.color)
  const Icon = tpl.icon
  const others = HABIT_TEMPLATES.filter((x) => x.key !== key)

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Streakly", item: `${SITE_URL}/${locale}` },
            { "@type": "ListItem", position: 2, name: t.guides.breadcrumbs, item: `${SITE_URL}/${locale}/templates` },
            { "@type": "ListItem", position: 3, name: g.title, item: `${SITE_URL}/${locale}/templates/${slug}` },
          ],
        }}
      />
      <SiteHeader />
      <main id="main" className="flex-1">
        <article className="mx-auto grid max-w-3xl gap-10 px-4 py-12">
          <header className="grid gap-4">
            <nav aria-label={t.guides.breadcrumbs} className="flex items-center gap-1 text-sm text-muted-foreground">
              <Link href="/templates" className="hover:text-foreground hover:underline">
                {t.guides.breadcrumbs}
              </Link>
              <ChevronRightIcon className="size-3.5" aria-hidden />
              <span aria-current="page" className="text-foreground">
                {g.title}
              </span>
            </nav>
            <h1 className="flex items-center gap-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", color.soft)}>
                <Icon className={cn("size-5", color.text)} aria-hidden />
              </span>
              {g.title}
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">{g.intro}</p>
            <p className="text-sm">
              <span className="text-muted-foreground">{t.guides.frequency}:</span> <span className="font-medium">{g.frequency}</span>
            </p>
          </header>

          <section className="grid gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{t.guides.cuesTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.guides.cuesLead}</p>
            <ul className="grid gap-2">
              {g.cues.map((cue) => (
                <li key={cue} className="flex gap-2.5 rounded-lg border px-4 py-3 text-sm">
                  <CheckIcon className={cn("mt-0.5 size-4 shrink-0", color.text)} aria-hidden /> {cue}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{t.guides.miniTitle}</h2>
            <p className="leading-relaxed text-muted-foreground">{g.mini}</p>
          </section>

          <section className="grid gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{t.guides.stepsTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.guides.stepsLead}</p>
            <ol className="grid gap-2">
              {g.steps.map((step, i) => (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium", color.soft, color.text)}>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <section className="grid gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{t.guides.pitfallsTitle}</h2>
            <ul className="grid gap-3">
              {g.pitfalls.map((p) => (
                <li key={p.t} className="flex gap-3">
                  <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                  <span>
                    <span className="font-medium">{p.t}.</span> <span className="text-muted-foreground">{p.d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3 rounded-xl border bg-card p-6">
            <h2 className="text-xl font-semibold tracking-tight">{t.guides.ctaTitle}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.guides.ctaText}</p>
            <div className="flex flex-wrap gap-2">
              <Button render={<Link href="/login?signup=1" />}>{t.guides.ctaStart}</Button>
              <Button variant="outline" render={<Link href="/demo" />}>
                {t.guides.ctaDemo}
              </Button>
            </div>
          </section>

          <nav aria-labelledby="more-guides" className="grid gap-3">
            <h2 id="more-guides" className="text-lg font-semibold tracking-tight">
              {t.guides.more}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {others.map((o) => (
                <li key={o.key}>
                  <Link
                    href={`/templates/${GUIDE_SLUGS[o.key]}`}
                    className="inline-flex rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                  >
                    {GUIDES[o.key][locale].title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </article>
      </main>
      <SiteFooter />
    </>
  )
}
