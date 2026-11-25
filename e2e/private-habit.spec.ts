import { expect, test } from "@playwright/test"

// A private habit is tracked as usual but never shown on the public profile.
test("a private habit stays off the public profile", async ({ page, browser }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("demo@streakly.dev")
  await page.getByLabel("Password").fill("streakly-demo")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  const name = `E2E private ${Date.now()}`
  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: name }) })
  const visitor = await browser.newPage() // signed out
  const publicHas = async (visible: boolean) => {
    await expect(async () => {
      await visitor.goto("/u/demo")
      await expect(visitor.getByText("Read 10 pages").first()).toBeVisible()
      await expect(visitor.getByText(name)).toHaveCount(visible ? 1 : 0)
    }).toPass({ timeout: 20_000 })
  }

  try {
    await page.getByRole("button", { name: "New habit" }).click()
    await page.getByLabel("Name").fill(name)
    await page.getByRole("switch", { name: "Private habit" }).click()
    await page.getByRole("button", { name: "Create habit" }).click()
    await expect(card).toBeVisible()
    await expect(card.getByText("Private — only you can see it")).toBeAttached() // the lock's label
    await publicHas(false)

    // make it public again → it shows up on the profile
    await card.getByRole("button", { name: "Habit actions" }).click()
    await page.getByRole("menuitem", { name: "Edit" }).click()
    const toggle = page.getByRole("switch", { name: "Private habit" })
    await expect(toggle).toHaveAttribute("aria-checked", "true")
    await toggle.click()
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await publicHas(true)
  } finally {
    await visitor.close()
    await page.goto("/dashboard")
    if (await card.count()) {
      await card.getByRole("button", { name: "Habit actions" }).click()
      await page.getByRole("menuitem", { name: "Delete" }).click()
      await page.getByRole("button", { name: "Delete", exact: true }).click()
      await expect(card).toHaveCount(0)
    }
  }
})
