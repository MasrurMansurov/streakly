/**
 * Avatar initials: the first letter of the first and the last word —
 * "Demo User" → "DU", "Chloé Dubois" → "CD", "masrur" → "M". Grapheme-safe
 * (accents, emoji, Cyrillic), ignores punctuation like "@" or "(".
 */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/[\s._-]+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+/u, ""))
    .filter(Boolean)
  if (words.length === 0) return "?"
  const first = (w: string) => Array.from(new Intl.Segmenter().segment(w))[0]?.segment ?? ""
  const letters = words.length === 1 ? first(words[0]) : first(words[0]) + first(words[words.length - 1])
  return letters.toLocaleUpperCase()
}
