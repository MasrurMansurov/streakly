import { Icon3D, type Icon3DName } from "@/components/icon-3d"
import { Link } from "@/components/link"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getT } from "@/i18n/server"
import { cn } from "@/lib/utils"

const FEATURE_ICONS: Icon3DName[] = ["calendar", "fire", "megaphone", "shield"]
/** soft tinted tiles behind the big 3D icons */
const TILE_BG = [
  "bg-gradient-to-br from-rose-100 to-orange-50 dark:from-rose-500/15 dark:to-orange-500/5",
  "bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-500/15 dark:to-yellow-500/5",
  "bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-500/15 dark:to-amber-500/5",
  "bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/5",
]

// decorative heatmap preview, deterministic so the page is fully static
const PREVIEW = Array.from({ length: 7 * 20 }, (_, i) => ((i * 37 + (i % 7) * 11) % 9) % 5)
const SHADES = ["bg-muted", "bg-emerald-200 dark:bg-emerald-900", "bg-emerald-400 dark:bg-emerald-700", "bg-emerald-500", "bg-emerald-700 dark:bg-emerald-300"]

/** 3D icons floating around the preview card */
const FLOATERS: { name: Icon3DName; size: number; className: string; delay: string }[] = [
  { name: "fire", size: 104, className: "-top-14 -left-10", delay: "0s" },
  { name: "trophy", size: 96, className: "-right-10 -bottom-14", delay: "-1.5s" },
  { name: "rocket", size: 80, className: "-top-14 right-6", delay: "-3s" },
  { name: "calendar", size: 76, className: "-bottom-12 left-10", delay: "-2.2s" },
]

export default async function Home() {
  const { t } = await getT()
  return (
    <>
      <SiteHeader />
      <main className="flex-1 overflow-x-clip">
        <section className="relative mx-auto grid max-w-5xl gap-14 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          {/* soft glow behind the hero */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-10 right-0 -z-10 size-80 rounded-full bg-emerald-400/20 blur-3xl md:size-[28rem] dark:bg-emerald-500/10"
          />
          <div className="grid gap-6">
            <span className="w-fit rounded-full border px-3 py-1 text-xs text-muted-foreground motion-safe:animate-rise">
              {t.landing.badge}
            </span>
            <h1
              className="text-4xl font-semibold tracking-tight text-balance motion-safe:animate-rise md:text-5xl"
              style={{ animationDelay: "80ms" }}
            >
              {t.landing.titleStart}{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                {t.landing.titleAccent}
              </span>
              .
            </h1>
            <p className="max-w-md text-lg text-muted-foreground motion-safe:animate-rise" style={{ animationDelay: "160ms" }}>
              {t.landing.subtitle}
            </p>
            <div className="flex flex-wrap gap-3 motion-safe:animate-rise" style={{ animationDelay: "240ms" }}>
              <Button size="lg" className="transition-transform hover:-translate-y-0.5" render={<Link href="/login" />}>
                {t.landing.getStarted}
              </Button>
              <Button size="lg" variant="outline" render={<Link href="#features" />}>
                {t.landing.seeFeatures}
              </Button>
            </div>
          </div>

          <div className="relative motion-safe:animate-rise" style={{ animationDelay: "200ms" }} aria-hidden>
            {FLOATERS.map((f) => (
              <span key={f.name} className={cn("absolute z-10 drop-shadow-xl", f.className)}>
                <Icon3D
                  name={f.name}
                  size={f.size}
                  eager
                  className="motion-safe:animate-float"
                  // each icon bobs out of phase with the others
                  style={{ animationDelay: f.delay }}
                />
              </span>
            ))}
            <Card className="gap-4 p-5 shadow-xl">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{t.landing.previewTitle}</span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <Icon3D name="fire" size={18} eager /> {t.landing.previewStreak}
                </span>
              </div>
              <div className="grid grid-flow-col grid-rows-7 gap-[3px] overflow-hidden">
                {PREVIEW.map((lvl, i) => (
                  <div
                    key={i}
                    className={cn("aspect-square rounded-[3px] motion-safe:animate-cell-in", SHADES[lvl])}
                    // cells appear column by column, like a wave
                    style={{ animationDelay: `${300 + Math.floor(i / 7) * 35}ms` }}
                  />
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section id="features" className="border-t bg-muted/30">
          <div className="mx-auto grid max-w-5xl gap-4 px-4 py-16 sm:grid-cols-2">
            {t.landing.features.map(({ title, text }, i) => (
              <Card
                key={title}
                className="group flex-row items-start gap-4 p-5 transition-all hover:-translate-y-1 hover:shadow-lg motion-safe:animate-rise"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className={cn("flex size-20 shrink-0 items-center justify-center rounded-2xl", TILE_BG[i])}>
                  <Icon3D
                    name={FEATURE_ICONS[i]}
                    size={64}
                    className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                  />
                </span>
                <div className="grid gap-1.5">
                <h2 className="font-medium">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">{t.landing.footer}</footer>
    </>
  )
}
