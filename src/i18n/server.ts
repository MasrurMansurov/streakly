import "server-only"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { locale as rootLocale } from "next/root-params"

import { defaultLocale, getDictionary, isLocale, LOCALE_COOKIE, localizePath, splitLocale, type Locale } from "."

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
  // The page the action was sent from (/ru/… or /en/…) is the most reliable signal;
  // public pages are served without the proxy, so the cookie may be stale for guests.
  const referer = (await headers()).get("referer")
  if (referer) {
    const { locale } = splitLocale(new URL(referer).pathname)
    if (locale) return locale
  }
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
