#!/usr/bin/env node
/**
 * lint:design — keeps Streakly from sliding back into the template look.
 * See reports/Интерфейс без признаков ИИ.md and docs/design/PRINCIPLES.md.
 *
 *   node scripts/lint-design.mjs        → exits 1 and lists every problem
 *
 * Checks
 *  1. UI code (.tsx): no raw Tailwind palette colors (bg-emerald-500, text-sky-700 …)
 *     — use the tokens: primary, done, streak, freeze, pause, missed, warning, info, heat-0…4.
 *     Habit colors come from lib/habit-colors.ts (a .ts file, not checked).
 *  2. UI code: no backdrop-blur (glassmorphism) and no all-caps labels (`uppercase`).
 *  3. Dictionaries: no exclamation marks, no emoji, no stock AI-copy words.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = new URL("..", import.meta.url).pathname

/** Files allowed to use raw colors, each with the reason. */
const COLOR_ALLOW = {
  // sample habits in the hero — habit colors, like lib/habit-colors.ts
  "src/components/landing/today-demo.tsx": "sample habit colors",
  // print sheets: fixed ink on paper, independent of the theme
  "src/app/[locale]/habit-tracker-printable/printable-tracker.tsx": "print sheet",
  "src/app/[locale]/year-in-pixels/year-in-pixels.tsx": "print sheet",
}
/** Image routes (OG, share cards) style with inline CSS for the renderer, not the UI. */
const SKIP_DIRS = ["src/app/api", "node_modules"]

const PALETTE =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow|marker:text|placeholder)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g
const BLUR = /\bbackdrop-blur(?:-\w+)?\b/g
const CAPS = /(?:className=|cn\(|["'`\s])uppercase\b/g

const BANNED_EN = /\b(?:unlock(?:ed|s)?|supercharge|seamless(?:ly)?|effortless(?:ly)?|elevate|empower|oops|dive in)\b/i
const BANNED_RU = /(?:прокача|бесшовн|упс\b|легко и просто|откройте для себя)/i
// pictographic emoji (keeps typographic symbols like → · — ×)
const EMOJI = /\p{Extended_Pictographic}/u

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const rel = relative(ROOT, path)
    if (SKIP_DIRS.some((d) => rel === d || rel.startsWith(`${d}/`))) continue
    if (statSync(path).isDirectory()) walk(path, out)
    else if (name.endsWith(".tsx")) out.push(rel)
  }
  return out
}

const problems = []
const lineOf = (text, index) => text.slice(0, index).split("\n").length

for (const file of walk(join(ROOT, "src"))) {
  const text = readFileSync(join(ROOT, file), "utf8")
  if (!(file in COLOR_ALLOW)) {
    for (const m of text.matchAll(PALETTE)) problems.push(`${file}:${lineOf(text, m.index)}  raw color "${m[0]}" — use a token`)
  }
  for (const m of text.matchAll(BLUR)) problems.push(`${file}:${lineOf(text, m.index)}  "${m[0]}" — opaque surfaces, no glass`)
  for (const m of text.matchAll(CAPS)) problems.push(`${file}:${lineOf(text, m.index)}  "uppercase" — no all-caps labels`)
}

// dictionaries: only the string literals
for (const [file, banned] of [
  ["src/i18n/dictionaries/en.ts", BANNED_EN],
  ["src/i18n/dictionaries/ru.ts", BANNED_RU],
]) {
  const text = readFileSync(join(ROOT, file), "utf8")
  for (const m of text.matchAll(/(["`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const str = m[2]
    const at = `${file}:${lineOf(text, m.index)}`
    if (/!(?:\s|$)/.test(str)) problems.push(`${at}  "!" in "${str.slice(0, 50)}" — calm voice, no exclamation marks`)
    if (EMOJI.test(str)) problems.push(`${at}  emoji in "${str.slice(0, 50)}"`)
    const word = str.match(banned)
    if (word) problems.push(`${at}  "${word[0]}" — stock AI copy, say the concrete thing`)
  }
}

if (problems.length) {
  console.error(`lint:design — ${problems.length} problem(s):\n${problems.map((p) => `  ${p}`).join("\n")}`)
  process.exit(1)
}
console.log("lint:design — clean")
