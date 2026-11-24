import { expect, test } from "@playwright/test"

test("a habit with an if-then plan shows when to do it", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  const name = `E2E plan ${Date.now()}`
  await page.getByRole("button", { name: "or create your own" }).click()
  await page.getByLabel("Name").fill(name)
  await page.getByRole("button", { name: "After brushing my teeth" }).click() // suggestion chip
  await expect(page.getByLabel(/When\? \(if-then plan\)/)).toHaveValue("After brushing my teeth")
  await page.getByRole("button", { name: "Create habit" }).click()

  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: name }) })
  await expect(card.getByText("When: after brushing my teeth")).toBeVisible()

  // clean up
  await card.getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
})
