import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"

import { Link } from "@/components/link"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getT } from "@/i18n/server"
import { indexableMetadata } from "@/lib/seo"

import { YearInPixels } from "./year-in-pixels"

const PATH = "/year-in-pixels"

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT()
  return { title: { absolute: t.pixels.metaTitle }, description: t.pixels.metaDescription, ...indexableMetadata(locale, PATH) }
}

/** The year depends on today → only the tool renders per request; the rest is static. */
async function Tool() {
  await connection()
  return <YearInPixels initialYear={new Date().getUTCFullYear()} />
}

/** A free year-in-pixels tracker (a classic people search for and share), with a bridge to the app. */
export default async function PixelsPage() {
  const { t } = await getT()
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12">
          <div className="grid max-w-2xl gap-3 print:hidden">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{t.pixels.title}</h1>
            <p className="text-lg leading-relaxed text-muted-foreground">{t.pixels.lead}</p>
          </div>
          <Suspense fallback={<Skeleton className="h-[36rem] rounded-xl" />}>
            <Tool />
          </Suspense>
        </section>

        <section className="border-t print:hidden">
          <div className="mx-auto grid max-w-3xl gap-6 px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight">{t.pixels.howTitle}</h2>
            <ol className="grid gap-4 sm:grid-cols-2">
              {t.pixels.how.map(({ t: title, d }, i) => (
                <li key={title} className="grid gap-1 rounded-xl border p-4">
                  <span className="text-sm font-semibold">
                    {i + 1}. {title}
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{d}</span>
                </li>
              ))}
            </ol>
            <div className="grid gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">{t.pixels.appTitle}</h2>
              <p className="leading-relaxed text-muted-foreground">{t.pixels.app}</p>
              <Button className="w-fit" render={<Link href="/" />}>
                {t.pixels.cta}
              </Button>
            </div>
          </div>
        </section>
      </main>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </>
  )
}
