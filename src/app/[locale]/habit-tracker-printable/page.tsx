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

import { PrintableTracker } from "./printable-tracker"

const PATH = "/habit-tracker-printable"

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT()
  return { title: { absolute: t.printable.metaTitle }, description: t.printable.metaDescription, ...indexableMetadata(locale, PATH) }
}

/** The month depends on today → only this part renders per request; the rest of the page is static. */
async function Tracker() {
  await connection()
  const now = new Date()
  return <PrintableTracker initialMonth={`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`} />
}

/** A free tool people search for ("habit tracker printable"), with a gentle way into the app. */
export default async function PrintablePage() {
  const { t } = await getT()
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12">
          <div className="grid max-w-2xl gap-3 print:hidden">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">{t.printable.title}</h1>
            <p className="text-lg leading-relaxed text-muted-foreground">{t.printable.lead}</p>
          </div>
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <Tracker />
          </Suspense>
        </section>

        <section className="border-t print:hidden">
          <div className="mx-auto grid max-w-3xl gap-6 px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight">{t.printable.howTitle}</h2>
            <ol className="grid gap-4 sm:grid-cols-2">
              {t.printable.how.map(({ t: title, d }, i) => (
                <li key={title} className="grid gap-1 rounded-xl border p-4">
                  <span className="text-sm font-semibold">
                    {i + 1}. {title}
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{d}</span>
                </li>
              ))}
            </ol>
            <div className="grid gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">{t.printable.whyTitle}</h2>
              <p className="leading-relaxed text-muted-foreground">{t.printable.why}</p>
              <Button className="w-fit" render={<Link href="/" />}>
                {t.printable.cta}
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
