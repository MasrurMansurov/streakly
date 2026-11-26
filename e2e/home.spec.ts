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
