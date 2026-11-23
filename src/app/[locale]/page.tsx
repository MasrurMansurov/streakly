import { CalendarCheckIcon, FlameIcon, Share2Icon, ShieldCheckIcon } from "lucide-react"
import { Link } from "@/components/link"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getT } from "@/i18n/server"
import { cn } from "@/lib/utils"

const FEATURE_ICONS = [CalendarCheckIcon, FlameIcon, Share2Icon, ShieldCheckIcon]

// decorative heatmap preview, deterministic so the page is fully static
const PREVIEW = Array.from({ length: 7 * 20 }, (_, i) => ((i * 37 + (i % 7) * 11) % 9) % 5)
const SHADES = ["bg-muted", "bg-emerald-200 dark:bg-emerald-900", "bg-emerald-400 dark:bg-emerald-700", "bg-emerald-500", "bg-emerald-700 dark:bg-emerald-300"]

export default async function Home() {
  const { t } = await getT()
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="grid gap-6">
            <span className="w-fit rounded-full border px-3 py-1 text-xs text-muted-foreground">
              {t.landing.badge}
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              {t.landing.titleStart} <span className="text-emerald-500">{t.landing.titleAccent}</span>.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              {t.landing.subtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/login" />}>
                {t.landing.getStarted}
              </Button>
              <Button size="lg" variant="outline" render={<Link href="#features" />}>
                {t.landing.seeFeatures}
              </Button>
            </div>
          </div>

          <Card className="gap-4 p-5" aria-hidden>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t.landing.previewTitle}</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <FlameIcon className="size-4" /> {t.landing.previewStreak}
              </span>
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-[3px] overflow-hidden">
              {PREVIEW.map((lvl, i) => (
                <div key={i} className={cn("aspect-square rounded-[3px]", SHADES[lvl])} />
              ))}
            </div>
          </Card>
        </section>

        <section id="features" className="border-t bg-muted/30">
          <div className="mx-auto grid max-w-5xl gap-4 px-4 py-16 sm:grid-cols-2">
            {t.landing.features.map(({ title, text }, i) => {
              const Icon = FEATURE_ICONS[i]
              return (
              <Card key={title} className="gap-2 p-5">
                <Icon className="size-5 text-emerald-500" />
                <h2 className="font-medium">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </Card>
              )
            })}
          </div>
        </section>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {t.landing.footer}
      </footer>
    </>
  )
}
