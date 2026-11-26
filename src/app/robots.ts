import type { MetadataRoute } from "next"

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

/** Private app pages (all noindex anyway) — keeps crawlers from spending time on login redirects. */
const APP = ["/dashboard", "/settings", "/me", "/wrapped"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...APP.flatMap((p) => [`/en${p}`, `/ru${p}`]), "/auth/"] },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
