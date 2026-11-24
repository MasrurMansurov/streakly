import { expect, test } from "@playwright/test"

const serverAction = (page: import("@playwright/test").Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

test("log today's mood and energy in one tap each", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole("button", { name: /Journal|Write a journal/ }).click()
  await expect(page.locator("section h3", { hasText: "Write a journal" })).toBeVisible()

  try {
    const mood = page.getByRole("radiogroup", { name: "Mood" })
    let saved = serverAction(page)
    await mood.getByRole("radio", { name: "Mood: Good" }).click()
    await saved
    saved = serverAction(page)
    await page.getByRole("radiogroup", { name: "Energy" }).getByRole("radio", { name: "Energy: Tired" }).click()
    await saved

    await page.reload()
    await expect(page.getByRole("radio", { name: "Mood: Good" })).toHaveAttribute("aria-checked", "true")
    await expect(page.getByRole("radio", { name: "Energy: Tired" })).toHaveAttribute("aria-checked", "true")
  } finally {
    const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: "Write a journal" }) })
    await card.getByRole("button", { name: "Habit actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
  }
})
