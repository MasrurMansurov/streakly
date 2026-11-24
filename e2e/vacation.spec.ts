import { expect, test } from "@playwright/test"

const serverAction = (page: import("@playwright/test").Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

test("vacation mode pauses streaks and can be ended early", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole("button", { name: /Walk 20 minutes/ }).click()
  await expect(page.locator("section h3", { hasText: "Walk 20 minutes" })).toBeVisible()

  try {
    await page.goto("/settings")
    let saved = serverAction(page)
    await page.getByRole("button", { name: "Start vacation" }).click()
    await saved
    await expect(page.getByText("Vacation mode is on — enjoy!")).toBeVisible()

    await page.goto("/dashboard")
    await expect(page.getByRole("status").filter({ hasText: /Vacation until .* streaks are paused/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /: vacation$/ })).toBeVisible() // today in the 7-day strip

    await page.goto("/settings")
    saved = serverAction(page)
    await page.getByRole("button", { name: "End vacation" }).click()
    await saved
    await expect(page.getByRole("button", { name: "Start vacation" })).toBeVisible()
  } finally {
    await page.goto("/settings")
    const end = page.getByRole("button", { name: "End vacation" })
    if (await end.isVisible()) await end.click()
    await page.goto("/dashboard")
    const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: "Walk 20 minutes" }) })
    await card.getByRole("button", { name: "Habit actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
  }
})
