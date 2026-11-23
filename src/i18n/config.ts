export const locales = ["en", "ru"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"

/** Remembers the last language the user picked (or that we detected). */
export const LOCALE_COOKIE = "NEXT_LOCALE"

export const localeNames: Record<Locale, string> = { en: "English", ru: "Русский" }

/** BCP 47 tags for Intl formatting. */
export const intlLocale: Record<Locale, string> = { en: "en-US", ru: "ru-RU" }

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}

/** Picks the best supported language from an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=")
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)
  for (const { lang } of ranked) if (isLocale(lang)) return lang
  return defaultLocale
}

/** "/ru/dashboard" → { locale: "ru", path: "/dashboard" } */
export function splitLocale(pathname: string): { locale: Locale | null; path: string } {
  const [, first, ...rest] = pathname.split("/")
  if (isLocale(first)) return { locale: first, path: `/${rest.join("/")}` }
  return { locale: null, path: pathname }
}

export function localizePath(locale: Locale, path: string): string {
  if (!path.startsWith("/")) return path // external or relative
  return path === "/" ? `/${locale}` : `/${locale}${path}`
}
