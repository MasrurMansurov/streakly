import "server-only"

import { readFile } from "node:fs/promises"
import { join } from "node:path"

const dir = join(process.cwd(), "src/assets/fonts")

/** Onest (text) and Unbounded (headings) with Latin + Cyrillic, for next/og images. */
export async function ogFonts() {
  const load = (f: string) => readFile(join(dir, f))
  const [onest400, onestCyr400, onest700, onestCyr700, unb700, unbCyr700] = await Promise.all([
    load("onest-latin-400-normal.woff"),
    load("onest-cyrillic-400-normal.woff"),
    load("onest-latin-700-normal.woff"),
    load("onest-cyrillic-700-normal.woff"),
    load("unbounded-latin-700-normal.woff"),
    load("unbounded-cyrillic-700-normal.woff"),
  ])
  // Latin and Cyrillic come as separate files: give each subset its own family name
  // and list both in font-family (see OG_HEADING / OG_TEXT), so the renderer
  // falls back within the same typeface instead of to another one.
  return [
    { name: "Unbounded", data: unb700, weight: 700 as const, style: "normal" as const },
    { name: "Unbounded Cyrillic", data: unbCyr700, weight: 700 as const, style: "normal" as const },
    { name: "Onest", data: onest400, weight: 400 as const, style: "normal" as const },
    { name: "Onest Cyrillic", data: onestCyr400, weight: 400 as const, style: "normal" as const },
    { name: "Onest", data: onest700, weight: 700 as const, style: "normal" as const },
    { name: "Onest Cyrillic", data: onestCyr700, weight: 700 as const, style: "normal" as const },
  ]
}

export const OG_HEADING = "Unbounded, 'Unbounded Cyrillic'"
export const OG_TEXT = "Onest, 'Onest Cyrillic'"
