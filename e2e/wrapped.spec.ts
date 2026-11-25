import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

// Growth plan 2.1: the year in review — stories you can tap through, and a
// 9:16 image to share that has numbers only (no habit names).
test("year in review: tap through the story and get the share image", async ({ page }) => {
  await signIn(page, "demo@streakly.dev", "streakly-demo")
  await page.goto("/wrapped")
  await expect(page.getByText(/Your (\d{4}|first \d+ days?) on Streakly/)).toBeVisible()
  await page.getByRole("button", { name: "Next" }).last().click()
  await expect(page.getByText("Check-ins", { exact: true })).toBeVisible()
  // the keyboard works too, up to the last screen
  for (let n = 0; n < 10; n++) await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("button", { name: "Share image" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Copy text" })).toBeVisible()

  const img = await page.request.get("/api/wrapped-card?locale=en")
  expect(img.status()).toBe(200)
  expect(img.headers()["content-type"]).toContain("image/png")
})

test("year in review image needs a signed-in user", async ({ browser }) => {
  const ctx = await browser.newContext()
  const res = await ctx.request.get("/api/wrapped-card")
  expect(res.status()).toBe(401)
  await ctx.close()
})
