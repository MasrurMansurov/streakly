import { CalendarCheck2Icon, FlameIcon, LockKeyholeIcon, Share2Icon, type LucideIcon } from "lucide-react"

import { Link } from "@/components/link"
import { LogoMark } from "@/components/logo"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { cn } from "@/lib/utils"

const FEATURE_ICONS: LucideIcon[] = [CalendarCheck2Icon, FlameIcon, Share2Icon, LockKeyholeIcon]

// decorative heatmap preview, deterministic so the page is fully static
const PREVIEW = Array.from({ length: 7 * 18 }, (_, i) => ((i * 37 + (i % 7) * 11) % 9) % 5)
const SHADES = [
  "bg-muted",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-400 dark:bg-emerald-700",
  "bg-emerald-500",
  "bg-emerald-700 dark:bg-emerald-300",
]

export default async function Home() {
  const { t } = await getT()
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-12 px-4 py-20 md:grid-cols-[1.1fr_1fr] md:items-center md:py-28">
          <div className="grid gap-7">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground motion-safe:animate-rise">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {t.landing.badge}
            </span>
            <h1
              className="text-4xl leading-[1.08] font-semibold text-balance motion-safe:animate-rise sm:text-5xl"
              style={{ animationDelay: "60ms" }}
            >
              {t.landing.titleStart} <span className="text-emerald-500">{t.landing.titleAccent}</span>.
            </h1>
            <p
              className="max-w-md text-lg leading-relaxed text-muted-foreground motion-safe:animate-rise"
              style={{ animationDelay: "120ms" }}
            >
              {t.landing.subtitle}
            </p>
            <div className="flex flex-wrap gap-3 motion-safe:animate-rise" style={{ animationDelay: "180ms" }}>
              <Button size="lg" className="h-11 px-5" render={<Link href="/login" />}>
                {t.landing.getStarted}
              </Button>
              <Button size="lg" variant="ghost" className="h-11 px-5" render={<Link href="#features" />}>
                {t.landing.seeFeatures}
              </Button>
            </div>
          </div>

          {/* product preview: a calm card, no decoration */}
          <div
            aria-hidden
            className="rounded-2xl border bg-card p-6 shadow-sm motion-safe:animate-rise"
            style={{ animationDelay: "150ms" }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <LogoMark size={20} />
                {t.landing.previewTitle}
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <FlameIcon className="size-4" /> {t.landing.previewStreak}
              </span>
            </div>
            <div className="mt-5 grid grid-flow-col grid-rows-7 gap-[3px]">
              {PREVIEW.map((lvl, i) => (
                <div
                  key={i}
                  className={cn("aspect-square rounded-[3px] motion-safe:animate-cell-in", SHADES[lvl])}
                  style={{ animationDelay: `${250 + Math.floor(i / 7) * 30}ms` }}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="border-t">
          <div className="mx-auto grid max-w-5xl gap-x-10 gap-y-12 px-4 py-20 sm:grid-cols-2">
            {t.landing.features.map(({ title, text }, i) => {
              const Icon = FEATURE_ICONS[i]
              return (
                <div key={title} className="grid gap-3 motion-safe:animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-emerald-600 dark:text-emerald-400">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <h2 className="text-base font-semibold">{title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              )
            })}
          </div>
        </section>
      </main>
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <LogoMark size={18} /> Streakly
          </span>
          <span>{t.landing.footer}</span>
        </div>
      </footer>
    </>
  )
}
