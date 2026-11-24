import { expect, test } from "@playwright/test"

const serverAction = (page: import("@playwright/test").Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

test("find a person by name and follow them from the results", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto("/friends")
  await page.getByRole("searchbox", { name: "Find people" }).fill("demo")
  await page.getByRole("button", { name: "Search" }).click()
  await expect(page).toHaveURL(/\/friends\?q=demo$/)
  const results = page.locator("[data-slot=card]", { hasText: "People matching “demo”" })
  await expect(results.getByRole("link", { name: /Demo User/ })).toBeVisible()

  const followed = serverAction(page)
  await results.getByRole("button", { name: "Follow", exact: true }).click()
  await followed
  await expect(results.getByRole("button", { name: "Following" })).toHaveAttribute("aria-pressed", "true")

  // clean up
  const unfollowed = serverAction(page)
  await results.getByRole("button", { name: "Following" }).click()
  await unfollowed
})

test("search input can't inject filters and private profiles stay hidden", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("demo@streakly.dev")
  await page.getByLabel("Password").fill("streakly-demo")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto(`/friends?q=${encodeURIComponent('x",is_public.eq.false,username.ilike."*')}`)
  await expect(page.getByText(/No public profiles found|People matching/).first()).toBeVisible()
  // the tester profile is private → never listed
  await page.goto("/friends?q=tester")
  await expect(page.getByText("No public profiles found", { exact: false })).toBeVisible()
})

test("leaderboard lists public profiles with ranks", async ({ page }) => {
  await page.goto("/leaderboard")
  await expect(page.getByRole("heading", { level: 1, name: "Leaderboard" })).toBeVisible()
  const row = page.getByRole("row", { name: /Demo User/ })
  await expect(row).toBeVisible()
  await expect(row.getByText(/(Newcomer|Apprentice|Practitioner|Expert|Master|Grandmaster|Legend) · @demo/)).toBeVisible()
  await row.getByRole("link").click()
  await expect(page).toHaveURL(/\/u\/demo$/)
})
