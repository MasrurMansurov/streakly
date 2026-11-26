import type { Metadata } from "next"

import { GUIDE_SLUGS } from "@/content/habit-guides"
import { locales, type Locale } from "@/i18n"

/** Absolute site origin (production: NEXT_PUBLIC_SITE_URL). Moving to a custom domain = changing this one value. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")

/** Public pages that search engines should index, without the locale prefix ("" = landing). */
export const INDEXABLE_PATHS = [
  "",
  "/demo",
  "/habit-tracker-printable",
  "/templates",
  ...Object.values(GUIDE_SLUGS).map((slug) => `/templates/${slug}`),
  "/leaderboard",
  "/privacy",
  "/terms",
]

/**
 * The language map of one page: a self canonical, the same page in every
 * language, and x-default. For the landing page x-default is "/", which picks
 * the visitor's language; deeper pages default to English.
 *
 *   alternatesFor("ru", "/leaderboard") → canonical /ru/leaderboard, en/ru/x-default
 */
export function alternatesFor(locale: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
      "x-default": path === "" ? "/" : `/en${path}`,
    },
  }
}

/** Open Graph basics for a page (child metadata replaces the parent's openGraph object, so pages spread this). */
export function openGraphFor(locale: Locale, path: string, image = `/${locale}/opengraph-image`): NonNullable<Metadata["openGraph"]> {
  return {
    url: `/${locale}${path}`,
    siteName: "Streakly",
    type: "website",
    locale: locale === "ru" ? "ru_RU" : "en_US",
    alternateLocale: locales.filter((l) => l !== locale).map((l) => (l === "ru" ? "ru_RU" : "en_US")),
    // setting openGraph on a page drops the inherited (and its own file-based) image, so name it
    // explicitly: the default one, or the page's own (profiles pass theirs)
    images: [{ url: image, width: 1200, height: 630, alt: "Streakly" }],
  }
}

/** Everything a public, indexable page needs: canonical + hreflang + Open Graph. */
export function indexableMetadata(locale: Locale, path: string, image?: string): Pick<Metadata, "alternates" | "openGraph"> {
  return { alternates: alternatesFor(locale, path), openGraph: openGraphFor(locale, path, image) }
}

/** Pages that must stay out of search (sign-in, the signed-in app, personal links). */
export const NOINDEX: Metadata["robots"] = { index: false, follow: false }

/** JSON-LD for a <script> tag: escapes "<" so user text can't close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
