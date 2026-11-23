import { intlLocale, type Locale } from "./config"

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }

const rules = new Map<Locale, Intl.PluralRules>()

/**
 * Picks the right plural form, e.g. Russian: 1 день / 2 дня / 5 дней.
 * `#` in the form is replaced with the number.
 */
export function plural(locale: Locale, n: number, forms: PluralForms): string {
  let pr = rules.get(locale)
  if (!pr) rules.set(locale, (pr = new Intl.PluralRules(intlLocale[locale])))
  const form = forms[pr.select(n)] ?? forms.other
  return form.replace("#", String(n))
}
