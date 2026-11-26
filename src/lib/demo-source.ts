/** Where a demo was started — `events.props.from` for "demo_started" (the growth funnel). */
export const DEMO_SOURCES = ["hero", "landing-cta", "demo-page", "login"] as const
export type DemoSource = (typeof DEMO_SOURCES)[number]

/** Anything not on the list (an old client, a typo) is counted as "other", never dropped. */
export function normalizeDemoSource(source: unknown): DemoSource | "other" {
  return DEMO_SOURCES.includes(source as DemoSource) ? (source as DemoSource) : "other"
}
