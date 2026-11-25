import { expect, test } from "@playwright/test"

// Growth plan 1.2: an invite link works for someone without an account — the
// page shows who invites and to which habit, the code survives sign-up, and
// after it the two are friends with a pact proposal waiting.
test("invite link: a new person signs up through it and gets the pact", async ({ browser, baseURL }) => {
  test.setTimeout(90_000)

  // demo creates an invite with a habit
  const demoCtx = await browser.newContext()
  await demoCtx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseURL!).origin })
  const demo = await demoCtx.newPage()
  await demo.goto("/login")
  await demo.getByLabel("Email").fill("demo@streakly.dev")
  await demo.getByLabel("Password").fill("streakly-demo")
  await demo.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(demo).toHaveURL(/\/dashboard$/)
  await demo.goto("/friends")
  await demo.getByRole("button", { name: "Invite a friend" }).click()
  const dialog = demo.getByRole("dialog")
  await dialog.getByRole("radio", { name: "Read 10 pages" }).click()
  await dialog.getByRole("button", { name: "Copy link" }).click()
  await expect(demo.getByText("Link copied")).toBeVisible()
  const link = await demo.evaluate(() => navigator.clipboard.readText())
  expect(link).toMatch(/\/en\/i\/[a-z0-9]{8}$/)
  await demoCtx.close()

  // a visitor without an account
  const visitorCtx = await browser.newContext()
  const page = await visitorCtx.newPage()
  await page.goto(new URL(link).pathname)
  await expect(page.getByRole("heading", { name: "Demo User invites you to Streakly" })).toBeVisible()
  await expect(page.getByText("Read 10 pages", { exact: true })).toBeVisible()
  // the link preview image renders
  const og = await page.request.get(`${new URL(link).pathname}/opengraph-image`)
  expect(og.status()).toBe(200)
  expect(og.headers()["content-type"]).toContain("image/png")

  await page.getByRole("link", { name: "Accept the invite" }).click()
  await expect(page.getByRole("tab", { name: "Sign up" })).toHaveAttribute("aria-selected", "true")
  await page.getByLabel("Email").fill(`e2e-invite-${Date.now()}@example.com`)
  await page.getByLabel("Password").fill(`Str3ak!y-${crypto.randomUUID()}`)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })
  await expect(page.getByText("@demo proposes a pact")).toBeVisible({ timeout: 15_000 })

  try {
    await page.goto("/friends")
    await expect(page.getByRole("link", { name: /Demo User/ }).first()).toBeVisible()
  } finally {
    await page.goto("/settings")
    const username = await page.getByLabel("Username").inputValue()
    await page.getByRole("button", { name: "Delete account…" }).click()
    const del = page.getByRole("dialog")
    await del.getByLabel("Username").fill(username)
    await del.getByRole("button", { name: "Delete forever" }).click()
    await expect(page).toHaveURL(/\/en$|\/$/, { timeout: 15_000 })
    await visitorCtx.close()
  }
})
