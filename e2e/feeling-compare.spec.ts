import { expect, test } from "@playwright/test"

// The "How you felt" card on a habit page (reports/Daybit и самочувствие в Streakly.md),
// on the demo's honest sample data: mood goes with meditation; the weekday-only
// habits can't be compared fairly.

test("a demo guest sees an honest with/without comparison on the habit pages", async ({ page }) => {
  await page.goto("/en/demo")
  await page.getByRole("button", { name: "Try without signing up" }).first().click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 })

  const open = async (name: RegExp) => {
    await page.goto("/en/dashboard")
    const href = await page.getByRole("link", { name }).first().getAttribute("href")
    await page.goto(href!)
    return page.locator("#feeling")
  }

  // a real pattern: shown with both day counts and the plain caveat
  const meditate = await open(/Meditate/)
  await expect(meditate.getByText("How you felt", { exact: true })).toBeVisible()
  await expect(meditate.getByText(/^Mood was higher on days with “Meditate”: \d\.\d vs \d\.\d\.$/)).toBeVisible()
  await expect(meditate.getByText("This shows what tends to happen together, not what causes what.", { exact: false })).toBeVisible()

  // the next-day view is a link (no client state) and marks itself as current
  await meditate.getByRole("link", { name: "Next day" }).click()
  await expect(page).toHaveURL(/\?lag=1#feeling$/)
  await expect(page.locator("#feeling").getByRole("link", { name: "Next day" })).toHaveAttribute("aria-current", "page")

  // weekday-bound habits: no verdict on a handful of comparable days
  const walk = await open(/30-minute walk/)
  await expect(walk.getByText("“30-minute walk” is almost always on the same weekdays", { exact: false }).first()).toBeVisible()
})
