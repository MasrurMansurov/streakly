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

import { Link } from "@/components/link"
import { TryDemoButton } from "@/components/try-demo-button"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { cn } from "@/lib/utils"

const FEATURE_ICONS: LucideIcon[] = [CalendarCheck2Icon, SnowflakeIcon, HandshakeIcon, LightbulbIcon, TrophyIcon, LockKeyholeIcon]

// the preview's habit colors (emerald, sky, rose) and a fixed last-7-days pattern
const PREVIEW_COLORS = ["bg-emerald-500", "bg-sky-500", "bg-rose-500"]
const PREVIEW_SOFT = ["bg-emerald-500/60", "bg-sky-500/60", "bg-rose-500/60"]
const WEEK = [true, true, false, true, true, true, false]

export default async function Home() {
  const { t } = await getT()
  return (
    <>
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
      </main>
      <SiteFooter />
    </>
  )
}
