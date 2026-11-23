import { intlLocale, type Locale } from "./config"
import { en, type Dictionary } from "./dictionaries/en"
import { ru } from "./dictionaries/ru"

export type { Dictionary } from "./dictionaries/en"
export * from "./config"

const dictionaries: Record<Locale, Dictionary> = { en, ru }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

/**
 * zod schemas carry message *keys* (e.g. "nameRequired") so they can be shared by
 * the client and the server; this turns a key into the localized text.
 */
export function validationMessage(t: Dictionary, key: string | undefined): string {
  if (!key) return t.validation.invalidInput
  return (t.validation as Record<string, string>)[key] ?? key
}

/** Format a "YYYY-MM-DD" date for the given UI language (dates are UTC calendar days). */
export function formatDay(locale: Locale, date: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat(intlLocale[locale], { ...opts, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
}
