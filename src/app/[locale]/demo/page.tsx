import type { Metadata } from "next"
import { CheckIcon } from "lucide-react"

import { Link } from "@/components/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { TryDemoButton } from "@/components/try-demo-button"
import { getT } from "@/i18n/server"
import { indexableMetadata } from "@/lib/seo"

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT()
  return { title: { absolute: t.demoPage.metaTitle }, description: t.demoPage.metaDescription, ...indexableMetadata(locale, "/demo") }
}

/** A crawlable page for "try without signing up" — the button itself is not a link. */
export default async function DemoPage() {
  const { t } = await getT()
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-2xl gap-6 px-4 py-16">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">{t.demoPage.title}</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">{t.demoPage.lead}</p>
          <ul className="grid gap-3">
            {t.demoPage.points.map((point) => (
              <li key={point} className="flex gap-3">
                <CheckIcon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <TryDemoButton variant="default" source="demo-page" />
          </div>
          <p className="text-sm text-muted-foreground">{t.demoPage.note}</p>
          <p className="text-sm">
            {t.demoPage.or}{" "}
            <Link href="/login?signup=1" className="font-medium underline underline-offset-4 hover:text-foreground">
              {t.demoPage.signUp}
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
