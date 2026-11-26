import type { Locale } from "@/i18n"

/**
 * Russian typesetting: glue short prepositions, conjunctions and particles to
 * the next word with a no-break space, so a line never ends with «в», «и», «не»…
 * English text is returned as is.
 */
const RU_SHORT = /(^|[\s(«—])((?:[ВКСУОИАЯвксуоиая]|не|ни|на|по|за|из|от|до|об|со|ко|во|бы|ли|же|без|для|при|про|под|над|что|как|или|но|да)) /g

export function typo(locale: Locale, text: string): string {
  if (locale !== "ru") return text
  return text.replace(RU_SHORT, "$1$2 ").replace(RU_SHORT, "$1$2 ")
}
