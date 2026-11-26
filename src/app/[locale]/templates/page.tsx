import type { Metadata } from "next"

import { Link } from "@/components/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { GUIDE_SLUGS, GUIDES } from "@/content/habit-guides"
import { getT } from "@/i18n/server"
import { habitColor } from "@/lib/habit-colors"
import { indexableMetadata } from "@/lib/seo"
import { HABIT_TEMPLATES } from "@/lib/templates"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT()
  return { title: { absolute: t.guides.indexMetaTitle }, description: t.guides.indexMetaDescription, ...indexableMetadata(locale, "/templates") }
}

/** All habit guides — a hub that links every template page (internal linking for search engines). */
export default async function TemplatesPage() {
  const { locale, t } = await getT()
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-14">
          <div className="grid max-w-2xl gap-3">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{t.guides.indexTitle}</h1>
            <p className="text-lg leading-relaxed text-muted-foreground">{t.guides.indexLead}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HABIT_TEMPLATES.map(({ key, icon: Icon, color }) => {
              const g = GUIDES[key][locale]
              return (
                <li key={key}>
                  <Link
                    href={`/templates/${GUIDE_SLUGS[key]}`}
                    className="grid h-full gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span className={cn("flex size-8 items-center justify-center rounded-lg", habitColor(color).soft)}>
                        <Icon className={cn("size-4", habitColor(color).text)} aria-hidden />
                      </span>
                      {g.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{g.frequency}</span>
                    <span className="line-clamp-3 text-sm text-muted-foreground">{g.intro}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
