import { CalendarCheckIcon, FlameIcon, Share2Icon, ShieldCheckIcon } from "lucide-react"
import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const FEATURES = [
  { icon: CalendarCheckIcon, title: "One-tap check-ins", text: "Mark habits done in a single tap. Missed yesterday? Fix it from the 7-day strip." },
  { icon: FlameIcon, title: "Streaks that motivate", text: "Current and best streaks for every habit, plus a 26-week activity heatmap." },
  { icon: Share2Icon, title: "Public profile", text: "Share your progress at /u/username — or keep everything private. Your call." },
  { icon: ShieldCheckIcon, title: "Private by default", text: "Postgres Row Level Security makes sure only you can see and edit your data." },
]

// decorative heatmap preview, deterministic so the page is fully static
const PREVIEW = Array.from({ length: 7 * 20 }, (_, i) => ((i * 37 + (i % 7) * 11) % 9) % 5)
const SHADES = ["bg-muted", "bg-emerald-200 dark:bg-emerald-900", "bg-emerald-400 dark:bg-emerald-700", "bg-emerald-500", "bg-emerald-700 dark:bg-emerald-300"]

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="grid gap-6">
            <span className="w-fit rounded-full border px-3 py-1 text-xs text-muted-foreground">
              Free · Open source · No ads
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              Build habits that <span className="text-emerald-500">stick</span>.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Streakly is a simple daily habit tracker. Check in, watch your streaks grow, and share your progress.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/login" />}>
                Get started — it&apos;s free
              </Button>
              <Button size="lg" variant="outline" render={<Link href="#features" />}>
                See features
              </Button>
            </div>
          </div>

          <Card className="gap-4 p-5" aria-hidden>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Activity</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <FlameIcon className="size-4" /> 24 day streak
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
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="gap-2 p-5">
                <Icon className="size-5 text-emerald-500" />
                <h2 className="font-medium">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Built with Next.js, Supabase &amp; Tailwind CSS
      </footer>
    </>
  )
}
