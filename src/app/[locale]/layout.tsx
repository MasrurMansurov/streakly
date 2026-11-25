import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import { ServiceWorkerRegister } from "@/components/sw-register"
import type { Metadata, Viewport } from "next"
import { Onest, Unbounded } from "next/font/google"
import { notFound } from "next/navigation"

import { ThemeProvider } from "@/components/theme-provider"
import { DayRollover } from "@/components/day-rollover"
import { ReminderSound } from "@/components/reminder-sound"
import { TimezoneSync } from "@/components/timezone-sync"
import { VisualViewportVars } from "@/components/visual-viewport"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { isLocale, locales } from "@/i18n"
import { I18nProvider } from "@/i18n/client"
import { getT } from "@/i18n/server"

import "../globals.css"

// Onest for all text; Unbounded only draws the "streakly" wordmark (one weight, Latin)
const onest = Onest({ variable: "--font-sans", subsets: ["latin", "cyrillic"] })
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: ["600"] })

/** Prerender every page once per language. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT()
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: t.meta.title, template: "%s · Streakly" },
    description: t.meta.description,
    applicationName: "Streakly",
    appleWebApp: { capable: true, title: "Streakly", statusBarStyle: "default" },
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
    openGraph: { locale: locale === "ru" ? "ru_RU" : "en_US" },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${onest.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <I18nProvider locale={locale}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster richColors position="bottom-right" />
            <TimezoneSync />
            <DayRollover />
            <ReminderSound />
            <VisualViewportVars />
          </ThemeProvider>
        </I18nProvider>
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
