import { expect, test } from "@playwright/test"

// Growth analytics: a visitor from ?utm_source=… signs up, and the source is
// handed to the new account (the first-touch cookie is consumed). The account
// is deleted at the end (set E2E_KEEP_ACCOUNT=1 to keep it for a DB check).
test("a new user's source is saved at sign-up", async ({ page, context }) => {
  test.setTimeout(60_000)
  await page.goto("/en?utm_source=e2e-attr&utm_medium=test")
  await expect
    .poll(async () => (await context.cookies()).find((c) => c.name === "st_attr")?.value ?? "")
    .toContain("e2e-attr")

  const email = `e2e-attr-${Date.now()}@example.com`
  await page.goto("/login")
  await page.getByRole("tab", { name: "Sign up" }).click()
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(`Str3ak!y-${crypto.randomUUID()}`)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })

  // the source went to the account → the cookie is gone
  await expect.poll(async () => (await context.cookies()).some((c) => c.name === "st_attr"), { timeout: 15_000 }).toBe(false)

  if (!process.env.E2E_KEEP_ACCOUNT) {
    await page.goto("/settings")
    const username = await page.getByLabel("Username").inputValue()
    await page.getByRole("button", { name: "Delete account…" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Username").fill(username)
    await dialog.getByRole("button", { name: "Delete forever" }).click()
    await expect(page).toHaveURL(/\/en$|\/$/, { timeout: 15_000 })
  } else {
    console.log("KEPT", email)
  }
})
