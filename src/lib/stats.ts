/** Small statistics helpers shared by the honest comparisons (feeling-compare, insights). */

/** One day of a comparison: its weekday (0 = Monday), which group it is in, and the value (a rating, or 0/1). */
export type WeekdayRow = { weekday: number; done: boolean; value: number }

/** Weekday-adjusted difference (with − without) and how many weekdays could be compared. */
export function weekdayAdjustedDiff(pairs: readonly WeekdayRow[]): { diff: number; weekdays: number } {
  const sum = [Array(7).fill(0), Array(7).fill(0)] // [without, with]
  const n = [Array(7).fill(0), Array(7).fill(0)]
  for (const p of pairs) {
    const k = p.done ? 1 : 0
    sum[k][p.weekday] += p.value
    n[k][p.weekday]++
  }
  let num = 0
  let den = 0
  let weekdays = 0
  for (let w = 0; w < 7; w++) {
    const a = n[1][w]
    const b = n[0][w]
    if (a === 0 || b === 0) continue
    const weight = (a * b) / (a + b)
    num += weight * (sum[1][w] / a - sum[0][w] / b)
    den += weight
    weekdays++
  }
  return { diff: den ? num / den : NaN, weekdays }
}

/**
 * Permutation p-value for the weekday-adjusted difference: the `done` flags are
 * shuffled within each weekday, which keeps any weekday pattern and breaks only
 * the link being tested. "greater" tests with > without; "two-sided" any gap.
 */
export function withinWeekdayPermutationP(
  rows: readonly WeekdayRow[],
  random: () => number,
  { rounds = 1999, alternative = "two-sided" }: { rounds?: number; alternative?: "two-sided" | "greater" } = {}
): number {
  const stat = (d: number) => (alternative === "greater" ? d : Math.abs(d))
  const observed = weekdayAdjustedDiff(rows).diff
  if (!Number.isFinite(observed)) return 1
  const byWeekday: WeekdayRow[][] = Array.from({ length: 7 }, () => [])
  for (const r of rows) byWeekday[r.weekday].push(r)
  const flags = byWeekday.map((g) => g.map((r) => r.done))
  let atLeast = 0
  for (let k = 0; k < rounds; k++) {
    const shuffled: WeekdayRow[] = []
    for (let w = 0; w < 7; w++) {
      const f = shuffle(flags[w].slice(), random)
      byWeekday[w].forEach((r, i) => shuffled.push({ ...r, done: f[i] }))
    }
    const d = weekdayAdjustedDiff(shuffled).diff
    if (Number.isFinite(d) && stat(d) >= stat(observed) - 1e-12) atLeast++
  }
  return (atLeast + 1) / (rounds + 1)
}


/** A small, fast, seeded generator (mulberry32) — the same data gives the same interval. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
  let a = (h ^ (h >>> 16)) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Benjamini–Yekutieli: which of `m` tests survive at false-discovery rate `q`
 * under any dependence between them (habits and metrics are not independent).
 * Returns the indexes of the survivors.
 */
export function benjaminiYekutieli(pValues: readonly number[], q = 0.1): Set<number> {
  const m = pValues.length
  if (m === 0) return new Set()
  let harmonic = 0
  for (let i = 1; i <= m; i++) harmonic += 1 / i
  const order = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p)
  let cut = -1
  order.forEach(({ p }, k) => {
    if (p <= ((k + 1) / (m * harmonic)) * q) cut = k
  })
  return new Set(order.slice(0, cut + 1).map((x) => x.i))
}

/** Fisher–Yates shuffle in place, with the given generator. */
export function shuffle<T>(xs: T[], random: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[xs[i], xs[j]] = [xs[j], xs[i]]
  }
  return xs
}
