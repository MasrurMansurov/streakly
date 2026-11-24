import { expect, test, type Page } from "@playwright/test"

// Regression test: a signed-in user must never see another user's habits,
// even when that other user's profile is public (RLS lets anyone *read* those).
const DEMO = { email: "demo@streakly.dev", password: "streakly-demo" } // public profile with habits
const TESTER = { email: "tester@streakly.dev", password: "streakly-tester" } // private profile, no habits

async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password").fill(user.password)
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test("users only see their own habits", async ({ page, context }) => {
  // grab the URL of one of the demo user's habits
  await signIn(page, DEMO)
  const demoHabitHref = await page.getByRole("link", { name: "Read 10 pages" }).getAttribute("href")
  expect(demoHabitHref).toMatch(/^\/en\/habits\//)
  await context.clearCookies()

  await signIn(page, TESTER)
  await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Read 10 pages" })).toHaveCount(0)

  await page.goto(demoHabitHref!)
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()

  await page.goto("/archive")
  await expect(page.getByText("Nothing archived")).toBeVisible()
})

test("a new user can start from a template in one tap", async ({ page }) => {
  await signIn(page, TESTER)
  await page.getByRole("button", { name: /Drink 8 glasses of water/ }).click()
  await expect(page.getByText("“Drink 8 glasses of water” added")).toBeVisible()
  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: "Drink 8 glasses of water" }) })
  await expect(card).toBeVisible()

  // clean up so the tester account stays empty
  await card.getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
})
