import AxeBuilder from "@axe-core/playwright"
import { devices, expect, test, type Page } from "@playwright/test"

// P3 audit: WCAG 2.2 AA on the main pages, in light and dark, and 44×44px
// touch targets on a phone.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("demo@streakly.dev")
  await page.getByLabel("Password").fill("streakly-demo")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

async function violations(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" })
  const found: string[] = []
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme })
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    for (const v of violations) found.push(`${path} [${colorScheme}] ${v.id}: ${v.nodes.map((n) => n.html.slice(0, 160)).slice(0, 3).join(" | ")}`)
  }
  return found
}

test("public pages meet WCAG 2.2 AA", async ({ page }) => {
  test.setTimeout(90_000)
  const found: string[] = []
  for (const path of ["/", "/login", "/u/demo", "/leaderboard"]) found.push(...(await violations(page, path)))
  expect(found).toEqual([])
})

test("app pages meet WCAG 2.2 AA", async ({ page }) => {
  test.setTimeout(120_000)
  await signIn(page)
  const found: string[] = []
  for (const path of ["/dashboard", "/progress", "/friends", "/settings"]) found.push(...(await violations(page, path)))
  expect(found).toEqual([])
})

// a phone (touch screen → coarse pointer); the browser type stays as configured
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType, ...phone } = devices["Pixel 7"]

test.describe("on a phone", () => {
  test.use(phone)

  test("controls are at least 44×44px", async ({ page }) => {
    await signIn(page)
    const small: string[] = []
    for (const path of ["/dashboard", "/settings"]) {
      await page.goto(path)
      await expect(page.locator("main h1").first()).toBeVisible()
      small.push(
        ...(await page.$$eval("button, [role=radio], [role=tab], input:not([type=hidden]), select, textarea, a[data-slot=button]", (els) =>
          els
            .filter((e) => (e as HTMLElement).offsetParent !== null && e.getAttribute("role") !== "switch")
            .map((e) => ({ e, r: e.getBoundingClientRect() }))
            .filter(({ r }) => r.width < 44 || r.height < 44)
            .map(({ e, r }) => `${(e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`)
        )).map((s) => `${path}: ${s}`)
      )
    }
    expect(small).toEqual([])
  })
})
