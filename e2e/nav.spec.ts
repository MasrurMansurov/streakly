import { expect, test } from "@playwright/test"

test("main sections are one tap away (header on desktop, tab bar on phones)", async ({ page, isMobile }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("demo@streakly.dev")
  await page.getByLabel("Password").fill("streakly-demo")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  const nav = page.getByRole("navigation", { name: "Main" }).filter({ visible: true })
  await expect(nav).toHaveCount(1)
  await expect(nav.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page")

  await nav.getByRole("link", { name: "Progress" }).click()
  await expect(page).toHaveURL(/\/progress$/)
  await expect(page.getByRole("heading", { level: 1, name: "Progress" })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Progress" })).toHaveAttribute("aria-current", "page")

  await nav.getByRole("link", { name: "Leaderboard" }).click()
  await expect(page).toHaveURL(/\/leaderboard$/)
  await nav.getByRole("link", { name: "Friends" }).click()
  await expect(page).toHaveURL(/\/friends$/)

  // the tab bar never covers the end of the page on phones
  if (isMobile) {
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom))
    expect(padding).toBeGreaterThanOrEqual(64)
  }
})
