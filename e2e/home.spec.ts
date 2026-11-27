import { expect, test } from "@playwright/test"

// The landing page is for people who don't have Streakly yet.

test("signed in: the site and the logo open Today; ?home still shows the landing page", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("demo@streakly.dev")
  await page.getByLabel("Password").fill("streakly-demo")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  const res = await page.goto("/en")
  await expect(page).toHaveURL(/\/en\/dashboard$/)
  // a per-person redirect must never be cached by the CDN or the browser
  const hop = await res!.request().redirectedFrom()!.response()
  expect(hop!.status()).toBe(307)
  expect(hop!.headers()["cache-control"]).toContain("no-store")

  // the logo inside the app goes straight to Today
  await page.goto("/en/progress")
  await page.getByRole("link", { name: "Streakly" }).first().click()
  await expect(page).toHaveURL(/\/en\/dashboard$/)

  // "About Streakly" opens the landing page on purpose
  await page.goto("/en?home")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The habit tracker that forgives")
})

test("signed out: the landing page as usual", async ({ page }) => {
  const res = await page.goto("/en")
  expect(res!.status()).toBe(200)
  await expect(page).toHaveURL(/\/en$/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The habit tracker that forgives")
})

test("private pages ask to sign in", async ({ page }) => {
  for (const path of ["/en/me", "/en/wrapped"]) {
    await page.goto(path)
    await expect(page, path).toHaveURL(/\/en\/login$/)
  }
})

test("landing: honest rules instead of a comparison, one closing action", async ({ page }) => {
  await page.goto("/en")
  await expect(page.getByText("Typical tracker")).toHaveCount(0)
  await expect(page.getByText(/Often limited to 3/)).toHaveCount(0)
  await expect(page.getByRole("heading", { level: 2, name: "What Streakly does, and what it doesn't" })).toBeVisible()
  // the rules carry their conditions
  await expect(page.getByText(/Two misses in a row end the streak/)).toBeVisible()

  const closing = page.getByRole("region", { name: "Who builds Streakly" })
  await expect(closing.getByRole("button", { name: "Try without signing up" })).toHaveCount(1)
  await expect(closing.getByRole("link", { name: "Report a bug or idea" })).toHaveAttribute("href", /github\.com\/MasrurMansurov\/streakly\/issues\/new$/)
  await expect(closing.getByRole("link", { name: "Or create an account right away" })).toHaveAttribute("href", "/en/login?signup=1")

  await page.goto("/ru")
  await expect(page.getByRole("region", { name: "Кто делает Streakly" }).getByText("Масрур Мансуров")).toBeVisible()
})

test("the closing demo button starts the demo; a guest on the site gets a way back", async ({ page }) => {
  await page.goto("/en")
  await page.getByRole("region", { name: "Who builds Streakly" }).getByRole("button", { name: "Try without signing up" }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 })

  // a demo guest is not redirected away from the landing page — and sees it as a visitor
  await page.goto("/en")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The habit tracker that forgives")
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Today" })).toHaveCount(0)
  await page.getByRole("banner").getByRole("link", { name: "Back to the demo" }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})
