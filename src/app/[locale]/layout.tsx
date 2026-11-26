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
import { isLocale, locales } from "@/i18n"
import { I18nProvider } from "@/i18n/client"
import { getT } from "@/i18n/server"

import { SITE_URL } from "@/lib/seo"
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
