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
    await expect(page.getByRole("heading", { level: 1, name: "You're on vacation — rest up" })).toBeVisible()

    await page.goto("/settings")
    saved = serverAction(page)
    await page.getByRole("button", { name: "End vacation" }).click()
    await saved
    await expect(page.getByRole("button", { name: "Start vacation" })).toBeVisible()

    // a pause can be named "I'm ill" — same streak protection, kinder words
    await page.getByRole("radio", { name: "I'm ill" }).click()
    saved = serverAction(page)
    await page.getByRole("button", { name: "Pause while ill" }).click()
    await saved
    await expect(page.getByText("Paused. Get well soon — your streaks are safe.")).toBeVisible()
    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { level: 1, name: "Get well soon — your streaks will wait" })).toBeVisible()
    await expect(page.getByRole("button", { name: /: ill$/ })).toBeVisible()
    await page.goto("/settings")
    saved = serverAction(page)
    await page.getByRole("button", { name: "I'm feeling better" }).click()
    await saved
    await expect(page.getByRole("button", { name: "Start vacation" })).toBeVisible()
  } finally {
    await page.goto("/settings")
    for (const name of ["End vacation", "I'm feeling better"]) {
      const end = page.getByRole("button", { name })
      if (await end.isVisible()) await end.click()
    }
    await page.goto("/dashboard")
    const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: "Walk 20 minutes" }) })
    await card.getByRole("button", { name: "Habit actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
  }
})
