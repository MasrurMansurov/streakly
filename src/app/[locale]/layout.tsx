import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import { ServiceWorkerRegister } from "@/components/sw-register"
import type { Metadata, Viewport } from "next"
import { Onest, Unbounded } from "next/font/google"
import { notFound } from "next/navigation"

import { ThemeProvider } from "@/components/theme-provider"
import { AttributionCapture } from "@/components/attribution"
import { DayRollover } from "@/components/day-rollover"
import { ReminderSound } from "@/components/reminder-sound"
import { TimezoneSync } from "@/components/timezone-sync"
import { VisualViewportVars } from "@/components/visual-viewport"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getDictionary, isLocale, locales } from "@/i18n"
import { I18nProvider } from "@/i18n/client"
import { getT } from "@/i18n/server"

import { SITE_URL } from "@/lib/seo"
import "../globals.css"

// Onest for all text; Unbounded only draws the "streakly" wordmark (one weight, Latin)
const onest = Onest({ variable: "--font-sans", subsets: ["latin", "cyrillic"] })
// the brand face: the logo and the landing page's headings (Cyrillic too — Russian H1)
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "cyrillic"], weight: ["600"] })

/** Prerender every page once per language. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT()
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: "%s · Streakly" },
    description: t.meta.description,
    applicationName: "Streakly",
    appleWebApp: { capable: true, title: "Streakly", statusBarStyle: "default" },
    // no alternates here: each public page declares its own canonical + hreflang (lib/seo.ts);
    // a layout-wide map pointed every page's language versions at the landing page
    openGraph: { siteName: "Streakly", type: "website", locale: locale === "ru" ? "ru_RU" : "en_US" },
    twitter: { card: "summary_large_image" },
    // Search Console / Yandex Webmaster ownership (set the tokens in the hosting env)
    verification: {
      ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : {}),
      ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION ? { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION } : {}),
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fcfa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e0d" },
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
        {/* WCAG 2.4.1: the first Tab jumps past the header straight to the page */}
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {getDictionary(locale).nav.skip}
        </a>
        <I18nProvider locale={locale}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <TooltipProvider>{children}</TooltipProvider>
            {/* on a phone: above the bottom tab bar, not over it */}
            <Toaster position="bottom-right" mobileOffset={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }} />
            <TimezoneSync />
            <AttributionCapture />
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
