import { expect, test } from "@playwright/test"

test("landing page leads to sign in", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Build habits that")
  await page.getByRole("link", { name: /get started/i }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText("Welcome back")).toBeVisible()
})

test("protected pages redirect to login", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login$/)
})

test("login form validates input", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page.getByText("Enter a valid email")).toBeVisible()
  await expect(page.getByText("At least 8 characters")).toBeVisible()
})

test("public profile is visible without an account", async ({ page }) => {
  await page.goto("/u/demo")
  await expect(page.getByRole("heading", { name: "Demo User" })).toBeVisible()
  await expect(page.getByText("Read 10 pages")).toBeVisible()
  await expect(page).toHaveTitle(/Demo User's habits/)
})

test("unknown profile shows not found", async ({ page }) => {
  await page.goto("/u/this-user-does-not-exist")
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()
})

test("profile OG image renders", async ({ request }) => {
  const res = await request.get("/u/demo/opengraph-image")
  expect(res.status()).toBe(200)
  expect(res.headers()["content-type"]).toContain("image/png")
})
