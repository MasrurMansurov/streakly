import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

const serverAction = (page: Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

test("dashboard shows earned and locked achievements", async ({ page }) => {
  await signIn(page, "demo@streakly.dev", "streakly-demo")
  await page.goto("/progress")
  await expect(page.getByText("Achievements", { exact: true })).toBeVisible()
  await expect(page.getByText(/\d of 8 earned/)).toBeVisible()
  // comeback bonus: returning after a miss is an achievement of its own
  await expect(page.getByRole("listitem", { name: /^Comeback:/ })).toBeVisible()
  await expect(page.getByRole("listitem", { name: /^Never miss twice:/ })).toBeVisible()
  await expect(page.getByRole("listitem", { name: /One week: Earned/ })).toBeVisible()
  await expect(page.getByRole("listitem", { name: /Hundred days: \d+\/100/ })).toBeVisible()
})

test("public profile shows earned badges only", async ({ page }) => {
  await page.goto("/u/demo")
  await expect(page.getByRole("listitem", { name: /One week: Earned/ })).toBeVisible()
  await expect(page.getByRole("listitem", { name: /Hundred days/ })).toHaveCount(0)
})

test("first check-in unlocks 'First step'", async ({ page }) => {
  await signIn(page, "tester@streakly.dev", "streakly-tester")
  const name = `E2E first ${Date.now()}`
  await page.getByRole("button", { name: "or create your own" }).click()
  await page.getByLabel("Name").fill(name)
  await page.getByRole("button", { name: "Create habit" }).click()
  await expect(page.locator("section h3", { hasText: name })).toBeVisible()

  const done = serverAction(page)
  await page.getByRole("button", { name: `Mark "${name}" as done today` }).click()
  await done
  await expect(page.getByText("Achievement earned: First step")).toBeVisible()

  // clean up: deleting the habit removes its check-ins too
  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: name }) })
  await card.getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
})
