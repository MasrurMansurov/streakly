import { readFile } from "node:fs/promises"

import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test("export downloads all check-ins as CSV", async ({ page }) => {
  await signIn(page, "demo@streakly.dev", "streakly-demo")
  await page.goto("/settings")
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Export CSV" }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^streakly-\d{4}-\d{2}-\d{2}\.csv$/)
  const csv = await readFile((await file.path())!, "utf8")
  const lines = csv.trim().split("\r\n")
  expect(lines[0]).toContain("habit,description,color,times_per_week,created,archived,date,note")
  expect(lines.some((l) => l.startsWith("Read 10 pages,"))).toBe(true)
  expect(lines.length).toBeGreaterThan(100)
})

test("account deletion needs the exact username", async ({ page }) => {
  await signIn(page, "tester@streakly.dev", "streakly-tester")
  await page.goto("/settings")
  await page.getByRole("button", { name: "Delete account…" }).click()
  const dialog = page.getByRole("dialog")
  const confirm = dialog.getByRole("button", { name: "Delete forever" })
  await expect(confirm).toBeDisabled()
  await dialog.getByLabel("Username").fill("someone-else")
  await expect(confirm).toBeDisabled()
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toHaveCount(0)
})

test("dashboard shows the weekly review", async ({ page }) => {
  await signIn(page, "demo@streakly.dev", "streakly-demo")
  await page.goto("/progress")
  const card = page.locator("[data-slot=card]", { has: page.locator("[data-slot=card-title]", { hasText: /^This week$/ }) })
  await expect(card).toBeVisible()
  await expect(card.getByRole("img", { name: /^Last 8 weeks: / })).toBeVisible()
  await expect(card.getByText(/vs\. last week|same as last week|first week/)).toBeVisible()
})

test("dashboard shows insights found in the history", async ({ page }) => {
  await signIn(page, "demo@streakly.dev", "streakly-demo")
  await page.goto("/progress")
  const card = page.locator("[data-slot=card]", { has: page.locator("[data-slot=card-title]", { hasText: "Insights" }) })
  await expect(card).toBeVisible()
  await expect(card.getByText(/slips on|go together|back the very next day/).first()).toBeVisible()
})
