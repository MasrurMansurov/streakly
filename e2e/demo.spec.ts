import { expect, test } from "@playwright/test"

// Growth plan 1.3: try the app without signing up. A guest gets two months of
// sample habits, can use their own habits, can't reach other people, and can
// turn the demo into an account without losing what they did.
test("demo: try without signing up, then save it as an account", async ({ browser, baseURL }) => {
  test.setTimeout(120_000)
  const ctx = await browser.newContext()
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseURL!).origin })
  const page = await ctx.newPage()

  await page.goto("/en")
  await page.getByRole("button", { name: "Try without signing up" }).first().click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 })

  let converted = false
  try {
    // two months of sample history, today left for the guest
    await expect(page.getByText("This is a demo: data is kept for 7 days.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Read 10 pages" })).toBeVisible()

    // checking in works like for anyone
    // the sample history gives a running streak up to yesterday (a freeze covers its one miss)
    const reading = page.locator("[data-slot=card]", { has: page.getByRole("link", { name: "Read 10 pages" }) })
    const streak = async () => Number((await reading.getByText(/^\d+ days$/).first().textContent())?.match(/\d+/)?.[0])
    const before = await streak()
    expect(before).toBeGreaterThan(14)
    await reading.getByRole("button", { name: 'Mark "Read 10 pages" as done today' }).click()
    await expect(reading.getByText(`${before + 1} days`, { exact: true }).first()).toBeVisible()

    // reaching other people needs an account
    await page.goto("/en/friends")
    await page.getByRole("button", { name: "Invite a friend" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Copy link" }).click()
    await expect(page.getByText("This needs an account")).toBeVisible()
    await page.keyboard.press("Escape")

    // save progress → an account; sample habits removed (default), own data stays
    await page.goto("/en/dashboard")
    await page.getByRole("button", { name: "Save progress" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Email").fill(`e2e-demo-${Date.now()}@example.com`)
    await dialog.getByLabel("Password").fill(`Str3ak!y-${crypto.randomUUID()}`)
    await dialog.getByRole("button", { name: "Create account" }).click()
    await expect(page.getByText(/Your account is ready/)).toBeVisible({ timeout: 15_000 })
    converted = true
    await expect(page.getByText("This is a demo: data is kept for 7 days.")).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Read 10 pages" })).toHaveCount(0)

    // the account survives a fresh load (a real session, no longer a guest)
    await page.reload()
    await expect(page.getByText("This is a demo: data is kept for 7 days.")).toHaveCount(0)
  } finally {
    // clean up: delete the account (works for a guest too)
    await page.goto("/en/settings")
    const username = await page.getByLabel("Username").inputValue()
    await page.getByRole("button", { name: "Delete account…" }).click()
    const del = page.getByRole("dialog")
    await del.getByLabel("Username").fill(username)
    await del.getByRole("button", { name: "Delete forever" }).click()
    await expect(page).toHaveURL(/\/en$|\/$/, { timeout: 15_000 })
    await ctx.close()
    expect(converted).toBe(true)
  }
})
