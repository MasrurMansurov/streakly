"use client"

import NextLink from "next/link"
import type { ComponentProps } from "react"

import { localizePath } from "@/i18n"
import { useI18n } from "@/i18n/client"

/**
 * Drop-in replacement for next/link that keeps the current language:
 * <Link href="/dashboard"> → /ru/dashboard. Absolute URLs and hashes are untouched.
 */
export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { locale } = useI18n()
  const localized = typeof href === "string" ? localizePath(locale, href) : href
  return <NextLink href={localized} {...props} />
}
