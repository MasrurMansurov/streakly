/** Presets for profile customization (the database only accepts these keys). */

export const BANNERS = {
  aurora: "linear-gradient(135deg, #10b981 0%, #0ea5e9 55%, #8b5cf6 100%)",
  sunset: "linear-gradient(135deg, #f97316 0%, #f43f5e 50%, #a855f7 100%)",
  ocean: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 40%, #1e3a8a 100%)",
  forest: "linear-gradient(135deg, #84cc16 0%, #10b981 45%, #065f46 100%)",
  berry: "linear-gradient(135deg, #f472b6 0%, #be185d 50%, #7c3aed 100%)",
  ember: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 35%, #dc2626 100%)",
  midnight: "radial-gradient(120% 140% at 85% 0%, #4338ca 0%, #1e1b4b 45%, #0b1020 100%)",
  mono: "linear-gradient(135deg, #52525b 0%, #27272a 60%, #18181b 100%)",
} as const

export const ACCENTS = {
  emerald: "#10b981",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  amber: "#f59e0b",
  orange: "#f97316",
  teal: "#14b8a6",
  slate: "#64748b",
} as const

export const FRAMES = ["none", "ring", "gradient", "glow"] as const

export type BannerKey = keyof typeof BANNERS
export type AccentKey = keyof typeof ACCENTS
export type FrameKey = (typeof FRAMES)[number]

export const asBanner = (v: string | null | undefined): BannerKey => (v && v in BANNERS ? (v as BannerKey) : "aurora")
export const asAccent = (v: string | null | undefined): AccentKey => (v && v in ACCENTS ? (v as AccentKey) : "emerald")
export const asFrame = (v: string | null | undefined): FrameKey => (FRAMES as readonly string[]).includes(v ?? "") ? (v as FrameKey) : "none"

/** "https://github.com/masrur/" → "github.com/masrur" */
export function linkLabel(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/+$/, "")
    return `${u.hostname.replace(/^www\./, "")}${path}`.slice(0, 40)
  } catch {
    return url.slice(0, 40)
  }
}

/** Accepts "github.com/me" too — adds https:// and keeps only https URLs. */
export function normalizeLink(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  const withScheme = /^[a-z]+:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== "https:" || !u.hostname.includes(".")) return null
    return u.toString().slice(0, 200)
  } catch {
    return null
  }
}

/** WCAG relative luminance of "#rrggbb". */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** White or near-black text on `background`, whichever is more readable. */
export function readableTextOn(background: string): "#ffffff" | "#18181b" {
  return contrastRatio("#ffffff", background) >= contrastRatio("#18181b", background) ? "#ffffff" : "#18181b"
}
