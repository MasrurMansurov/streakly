import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("demo@streakly.dev")
  await page.getByLabel("Password").fill("streakly-demo")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test("one main navigation: three sections on desktop, four tabs on phones", async ({ page, isMobile }) => {
  await signIn(page)

  // exactly one "Main" landmark in the page — header row or tab bar, never both
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1)
  const nav = page.getByRole("navigation", { name: "Main" })
  await expect(nav.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page")
  await expect(nav.getByRole("link", { name: "Leaderboard" })).toHaveCount(0) // it lives under Friends now
  await expect(nav.getByRole("link", { name: "Profile" })).toBeVisible({ visible: isMobile })

  await nav.getByRole("link", { name: "Progress" }).click()
  await expect(page).toHaveURL(/\/progress$/)
  await expect(page.getByRole("heading", { level: 1, name: "Progress" })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Progress" })).toHaveAttribute("aria-current", "page")

  // Friends has two views; the leaderboard keeps Friends highlighted
  await nav.getByRole("link", { name: "Friends" }).click()
  await expect(page).toHaveURL(/\/friends$/)
  const views = page.getByRole("navigation", { name: "Friends" })
  await expect(views.getByRole("link", { name: "Following" })).toHaveAttribute("aria-current", "page")
  await views.getByRole("link", { name: "Leaderboard" }).click()
  await expect(page).toHaveURL(/\/leaderboard$/)
  await expect(page.getByRole("heading", { level: 1, name: "Leaderboard" })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Friends" })).toHaveAttribute("aria-current", "page")

  if (isMobile) {
    // the tab bar never covers the end of the page
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom))
    expect(padding).toBeGreaterThanOrEqual(64)
    // Profile: archive, settings, tools and sign-out in one place
    await nav.getByRole("link", { name: "Profile" }).click()
    await expect(page).toHaveURL(/\/me$/)
    await expect(nav.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page")
    await page.getByRole("link", { name: /^Settings/ }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(nav.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page")
  } else {
    // desktop: the personal things are in the avatar menu
    await page.getByRole("button", { name: /Account menu/ }).click()
    await expect(page.getByRole("menuitem", { name: "Archive" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Today" })).toHaveCount(0)
    await page.getByRole("menuitem", { name: "Profile" }).click()
    await expect(page).toHaveURL(/\/me$/)
  }
})

test("the first Tab reaches the skip link, which jumps to the page", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard")
  await page.goto("/en/templates")
  // under a busy test run the first key can land before the page is ready
  await page.waitForLoadState("load")
  await page.keyboard.press("Tab")
  const skip = page.getByRole("link", { name: "Skip to content" })
  await expect(skip).toBeFocused()
  await skip.press("Enter")
  await expect(page).toHaveURL(/#main$/)
})
