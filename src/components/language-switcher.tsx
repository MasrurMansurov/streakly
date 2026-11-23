"use client"

import { CheckIcon, LanguagesIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { rememberLocale } from "@/app/actions/locale"
import { localeNames, locales, localizePath, splitLocale, type Locale } from "@/i18n"
import { useI18n } from "@/i18n/client"

/** Switches the UI language, keeping the current page and query string. */
export function LanguageSwitcher() {
  const { locale, t } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()

  const switchTo = (next: Locale) => {
    if (next === locale) return
    void rememberLocale(next) // so "/" opens in this language next time
    // read the query at click time (useSearchParams would need a Suspense boundary in the static header)
    const target = localizePath(next, splitLocale(pathname).path) + window.location.search
    startTransition(() => router.replace(target, { scroll: false }))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label={t.nav.language} className="gap-1 px-2" />}>
        <LanguagesIcon />
        <span className="text-xs font-medium uppercase">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {locales.map((l) => (
          <DropdownMenuItem key={l} onClick={() => switchTo(l)} lang={l}>
            {localeNames[l]}
            {l === locale && <CheckIcon className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
