import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { locale as rootLocale } from "next/root-params"

import { defaultLocale, getDictionary, isLocale, LOCALE_COOKIE, localizePath, type Locale } from "."

/** Current UI language in Server Components (from the /[locale] URL segment). */
export async function getLocale(): Promise<Locale> {
  const value = await rootLocale()
  return isLocale(value) ? value : defaultLocale
}

export async function getT() {
  const locale = await getLocale()
  return { locale, t: getDictionary(locale) }
}

/**
 * Server Actions can't read root params; the proxy keeps the NEXT_LOCALE cookie
 * in sync with the URL, so use that.
 */
export async function getActionLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : defaultLocale
}

export async function getActionT() {
  const locale = await getActionLocale()
  return { locale, t: getDictionary(locale) }
}

/** redirect() to a path in the current language (for Server Actions). */
export async function localeRedirect(path: string): Promise<never> {
  redirect(localizePath(await getActionLocale(), path))
}
