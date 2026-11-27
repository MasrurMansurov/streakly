# Streakly design principles

The one rule: **Streakly must never look AI-generated or template-made.**
Every screen should read as a product with its own ideas — the forgiving streak,
the mini version, the seven-day strip — not as a default component kit.

Background and evidence: `reports/Интерфейс без признаков ИИ.md`.

## Three principles

1. **The streak is the hero.** Real product UI (the check circle, the 7-day strip,
   the year grid) instead of decorative illustrations, icon tiles or stat rows.
2. **Calm, specific, forgiving.** A missed day is information, never an alarm:
   no red for misses, no guilt, no exclamation marks. Facts instead of adjectives.
3. **One system.** Colors, type, motion and words come from the tokens and lists
   below. A new screen adds content, not a new style.

## Tokens (src/app/globals.css)

| Use | Token |
|---|---|
| Brand, links, primary buttons | `primary` |
| A completed check-in, progress bars | `done`, `done-soft` |
| The streak flame | `streak` |
| Freeze / repair, info text | `freeze`, `info` |
| Pause / vacation, caution text | `pause`, `warning` |
| A missed day (quiet gray) | `missed` |
| Heatmap, year grid, charts | `heat-0` … `heat-4`, `chart-1…5` |
| Raised surfaces (hero card, scenes) | `shadow-raised` |

Habit colors come from `src/lib/habit-colors.ts`. Raw Tailwind hues
(`bg-emerald-500`, `text-sky-700` …) are not used in UI code — `npm run lint:design`
fails on them (exceptions with reasons are listed in `scripts/lint-design.mjs`).

## Type

- **Onest** for all text. **Unbounded** (`font-brand`) for the wordmark, landing
  headings and big numbers (streaks, medals, the weekly percentage), always with
  `tabular-nums` for numbers.
- Sentence case everywhere. No all-caps labels.
- Russian strings go through `typo()` (`src/lib/typography.ts`) on public pages:
  short words and numbers stay with the next word.

## Layout and components

- Today is one column (a list you work through). Max widths: `3xl` for app
  screens, `5xl` for the landing grid.
- Opaque header and tab bar, no `backdrop-blur`, no glassmorphism, no gradients
  (the only exception: the profile banner's single-color fade).
- Empty states are left-aligned, with one action — no dashed box with a centered
  icon in a circle.
- Notices: neutral surface, color only in the icon (`components/notice.tsx`).
- Avatars: a real photo or `initials()` (`src/lib/initials.ts`) — never the first
  two letters of a name.

## Motion

- CSS only, 150–300 ms, ease-out; transform and opacity; `prefers-reduced-motion`
  turns decorative motion off.
- Confetti is for streak milestones (7, 30, 66, 100, 365) and the live hero card,
  not for every check-in.

## Before every UI commit

1. `npm run lint:design`, `npm run lint`, `npm test`.
2. Screenshots: EN + RU, light + dark, 1280 px + 390 px (and 320 px for tight
   layouts). Look at them.
3. The checklist in `docs/design/VOICE.md` for any new text.
