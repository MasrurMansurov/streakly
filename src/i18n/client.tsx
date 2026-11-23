"use client"

import { createContext, use, type ReactNode } from "react"

import { getDictionary, type Dictionary, type Locale } from "."

const I18nContext = createContext<{ locale: Locale; t: Dictionary } | null>(null)

/** Provides the UI language to Client Components (dictionaries are bundled, so only the locale is passed). */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <I18nContext value={{ locale, t: getDictionary(locale) }}>{children}</I18nContext>
}

export function useI18n() {
  const ctx = use(I18nContext)
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>")
  return ctx
}
