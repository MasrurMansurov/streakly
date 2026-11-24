import { expect, test } from "@playwright/test"

test("check-ins made offline are queued and synced when back online", async ({ page, context }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole("button", { name: /Walk 20 minutes/ }).click()
  const toggle = page.getByRole("button", { name: 'Mark "Walk 20 minutes" as done today' })
  await expect(toggle).toBeVisible()

  try {
    // the service worker caches the page, so it reloads without a connection
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await expect(toggle).toBeVisible()

    await context.setOffline(true)
    await page.reload()
    await expect(toggle).toBeVisible()

    await toggle.click()
    await expect(page.getByRole("status").filter({ hasText: "You're offline · 1 check-in saved" })).toBeVisible()
    await expect(page.getByRole("button", { name: 'Mark "Walk 20 minutes" as not done today' })).toBeVisible()

    await context.setOffline(false)
    await expect(page.getByText("1 offline check-in synced")).toBeVisible()
    await page.reload()
    await expect(page.getByRole("button", { name: 'Mark "Walk 20 minutes" as not done today' })).toBeVisible()
  } finally {
    await context.setOffline(false)
    await page.goto("/dashboard")
    const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: "Walk 20 minutes" }) })
    await card.getByRole("button", { name: "Habit actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
  }
})
