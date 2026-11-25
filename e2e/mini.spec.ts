import { expect, test } from "@playwright/test"

const serverAction = (page: import("@playwright/test").Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

test("mini version keeps the streak and can be upgraded to full", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
  // templates come with a mini version
  await page.getByRole("button", { name: /Read 10 pages/ }).click()
  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: "Read 10 pages" }) })
  await expect(card).toBeVisible()

  try {
    let saved = serverAction(page)
    await card.getByRole("button", { name: 'Mark the mini version of "Read 10 pages" (1 page) as done today' }).click()
    await saved
    await expect(card.getByText("1 day")).toBeVisible() // counts for the streak
    await expect(card.getByText("Mini version done", { exact: false })).toBeVisible()
    await page.reload()
    await expect(card.getByText("Mini version done", { exact: false })).toBeVisible() // persisted

    // tap the circle → full check-in
    saved = serverAction(page)
    await card.getByRole("button", { name: 'Mark "Read 10 pages" as done today' }).click()
    await saved
    await expect(card.getByRole("button", { name: 'Mark "Read 10 pages" as not done today' })).toBeVisible()
    // other background actions (time zone, push sync) may answer first: re-check after reloads
    await expect(async () => {
      await page.reload()
      await expect(card.getByText("Mini version done", { exact: false })).toHaveCount(0, { timeout: 2_000 })
    }).toPass({ timeout: 15_000 })
  } finally {
    await card.getByRole("button", { name: "Habit actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
  }
})
