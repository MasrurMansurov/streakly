/** Presets for profile customization (the database only accepts these keys). */

/**
 * Banners: one flat, deep color with Streakly's own motif — a strip of
 * activity cells, like a stretch of the heatmap — instead of rainbow gradients.
 * Keys are stored in the database, so they stay as they are.
 */
export const BANNERS = {
  aurora: "#0b5d45",
  forest: "#35591f",
  ocean: "#0c4a6e",
  sunset: "#9a3412",
  berry: "#831843",
  ember: "#854d0e",
  midnight: "#1e293b",
  mono: "#27272a",
} as const

// a fixed, irregular "activity" pattern (opacity per cell), 12 columns × 4 rows
const CELLS = [
  [0.04, 0.08, 0.13, 0.08, 0.18, 0.13, 0.04, 0.08, 0.18, 0.24, 0.13, 0.08],
  [0.08, 0.18, 0.04, 0.13, 0.24, 0.08, 0.13, 0.04, 0.13, 0.18, 0.04, 0.18],
  [0.13, 0.04, 0.18, 0.24, 0.08, 0.04, 0.18, 0.13, 0.08, 0.04, 0.24, 0.13],
  [0.18, 0.13, 0.08, 0.04, 0.13, 0.24, 0.08, 0.18, 0.04, 0.13, 0.08, 0.04],
]
const CELL = 12
const GAP = 6
const PATTERN = (() => {
  const w = CELLS[0].length * (CELL + GAP)
  const h = CELLS.length * (CELL + GAP)
  const rects = CELLS.flatMap((row, y) =>
    row.map((o, x) => `<rect x='${x * (CELL + GAP)}' y='${y * (CELL + GAP)}' width='${CELL}' height='${CELL}' rx='3' fill='white' fill-opacity='${o}'/>`)
  ).join("")
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${rects}</svg>`)}")`
})()

/** CSS `background` for a preset banner. */
export function bannerBackground(key: BannerKey): string {
  // the cells fade in from the right, like the end of a heatmap — quiet behind the avatar
  const base = BANNERS[key]
  return `linear-gradient(90deg, ${base} 20%, ${base}00 80%), ${PATTERN} 12px 12px / auto repeat, ${base}`
}

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

/** Every value the database may hold; "gradient" and "glow" are legacy and now draw as a ring. */
export const FRAMES = ["none", "ring", "gradient", "glow"] as const
/** What the settings offer. */
export const PICKABLE_FRAMES = ["none", "ring"] as const

export type BannerKey = keyof typeof BANNERS
export type AccentKey = keyof typeof ACCENTS
export type FrameKey = (typeof FRAMES)[number]

export const asBanner = (v: string | null | undefined): BannerKey => (v && v in BANNERS ? (v as BannerKey) : "aurora")
export const asAccent = (v: string | null | undefined): AccentKey => (v && v in ACCENTS ? (v as AccentKey) : "emerald")
export const asFrame = (v: string | null | undefined): (typeof PICKABLE_FRAMES)[number] =>
  v === "ring" || v === "gradient" || v === "glow" ? "ring" : "none"

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
