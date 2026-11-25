import { expect, test } from "@playwright/test"

// Per-habit reminder time (feedback from the Discord demo): set it, see it, clear it.
test("a habit can have its own reminder time", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  const name = `E2E remind ${Date.now()}`
  await page.getByRole("button", { name: "or create your own" }).click()
  await page.getByLabel("Name").fill(name)
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/^Reminder/).fill("07:30")
  await expect(page.getByText("Turn on reminders in Settings to get it.")).toBeVisible()
  await page.getByRole("button", { name: "Create habit" }).click()

  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: name }) })
  await expect(card.getByText("07:30")).toBeVisible()

  // edit: the time is prefilled, clearing it removes the reminder
  await card.getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Edit" }).click()
  await expect(dialog.getByLabel(/^Reminder/)).toHaveValue("07:30")
  await dialog.getByRole("button", { name: "Clear" }).click()
  await dialog.getByRole("button", { name: "Save" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(card.getByText("07:30")).toHaveCount(0)

  // clean up
  await card.getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
})
