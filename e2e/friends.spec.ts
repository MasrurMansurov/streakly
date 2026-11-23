import { expect, test, type Page } from "@playwright/test"

const TESTER = { email: "tester@streakly.dev", password: "streakly-tester" } // private profile

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(TESTER.email)
  await page.getByLabel("Password").fill(TESTER.password)
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

const serverAction = (page: Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

test("anonymous visitors are asked to sign in to follow", async ({ page }) => {
  await page.goto("/u/demo")
  await expect(page.getByRole("link", { name: "Sign in to follow" })).toBeVisible()
  await expect(page.getByText(/\d+ followers? · \d+ following/)).toBeVisible()
})

test("follow a public profile, see their check-ins, unfollow", async ({ page }) => {
  await signIn(page)
  await page.goto("/friends")
  await expect(page.getByText("You're not following anyone yet")).toBeVisible()

  await page.getByRole("link", { name: "Try the demo profile" }).click()
  await expect(page).toHaveURL(/\/u\/demo$/)
  const done = serverAction(page)
  await page.getByRole("button", { name: "Follow", exact: true }).click()
  await done
  await expect(page.getByRole("button", { name: "Following" })).toHaveAttribute("aria-pressed", "true")

  await page.goto("/friends")
  await expect(page.getByRole("link", { name: /Demo User/ }).first()).toBeVisible()
  await expect(page.getByText("completed").first()).toBeVisible()

  const undone = serverAction(page)
  await page.getByRole("button", { name: "Following" }).click()
  await undone
  await page.reload()
  await expect(page.getByText("You're not following anyone yet")).toBeVisible()
})
