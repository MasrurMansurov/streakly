import type { MetadataRoute } from "next"

import { locales } from "@/i18n"

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
const PAGES = ["", "/leaderboard", "/login", "/privacy", "/terms"]

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((page) =>
    locales.map((locale) => ({
      url: `${SITE}/${locale}${page}`,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE}/${l}${page}`])) },
    }))
  )
}
