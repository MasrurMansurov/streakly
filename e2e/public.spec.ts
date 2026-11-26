import { expect, test } from "@playwright/test"

test("landing page leads to sign in", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The habit tracker that forgives")
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

test("sign-up rejects a password from known data breaches", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("tab", { name: "Sign up" }).click()
  // never actually created: the check runs before Supabase is called
  await page.getByLabel("Email").fill(`pwned-${Date.now()}@example.com`)
  await page.getByLabel("Password").fill("password123")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByText("This password appears in known data breaches")).toBeVisible()
})

test("public profile is visible without an account", async ({ page }) => {
  await page.goto("/u/demo")
  await expect(page.getByRole("heading", { name: "Demo User" })).toBeVisible()
  // first visit refreshes once to apply the visitor's timezone; during the swap the
  // list can briefly exist twice, so don't require a single match
  await expect(page.getByText("Read 10 pages").first()).toBeVisible()
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

test("expired email link shows a helpful message", async ({ page }) => {
  await page.goto("/?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired")
  await expect(page).toHaveURL(/\/login\?error=otp_expired$/)
  await expect(page.getByRole("alert").filter({ hasText: "expired or was already used" })).toBeVisible()
})

test("app is installable (manifest + icons)", async ({ page, request }) => {
  const res = await request.get("/manifest.webmanifest")
  expect(res.status()).toBe(200)
  const manifest = await res.json()
  expect(manifest.display).toBe("standalone")
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200)

  await page.goto("/")
  const cdp = await page.context().newCDPSession(page)
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors")
  expect(installabilityErrors).toEqual([])
})

test("service worker and reminder function are reachable", async ({ request }) => {
  const sw = await request.get("/sw.js")
  expect(sw.status()).toBe(200)
  expect(await sw.text()).toContain('addEventListener("push"')
  // the function must refuse calls without the cron token / a user JWT
  const res = await request.post("https://oypfnyzhyyyrinxwtagz.supabase.co/functions/v1/send-reminders", {
    data: { action: "send" },
  })
  expect(res.status()).toBe(401)
})

test("cancelled OAuth sign-in comes back with a clear message", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied&error_description=User+cancelled")
  await expect(page).toHaveURL(/\/login\?error=access_denied$/)
  await expect(page.getByRole("alert").filter({ hasText: "Sign-in was cancelled or denied" })).toBeVisible()
})
