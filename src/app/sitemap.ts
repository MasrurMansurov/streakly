import type { MetadataRoute } from "next"

import { LEGAL_UPDATED } from "@/content/legal"
import { locales } from "@/i18n"
import { alternatesFor, INDEXABLE_PATHS, SITE_URL } from "@/lib/seo"

const absolute = (path: string) => `${SITE_URL}${path}`

/**
 * Only pages worth finding in search, each in every language, with the same
 * canonical + hreflang map the pages declare in their <head> (lib/seo.ts).
 * Sign-in, the app, invites and the year recap are noindex and stay out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.flatMap((path) =>
    locales.map((locale) => {
      const languages = alternatesFor(locale, path)!.languages as Record<string, string>
      return {
        url: absolute(`/${locale}${path}`),
        alternates: { languages: Object.fromEntries(Object.entries(languages).map(([l, p]) => [l, absolute(p)])) },
        ...(path === "/privacy" || path === "/terms" ? { lastModified: LEGAL_UPDATED } : {}),
      }
    })
  )
}
