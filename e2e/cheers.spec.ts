import { expect, test, type Browser, type Page } from "@playwright/test"

// Growth plan 3.1: a high five from the friends feed, seen by the friend on Today.

const DEMO = { email: "demo@streakly.dev", password: "streakly-demo" } // public, checks in every day
const TESTER = { email: "tester@streakly.dev", password: "streakly-tester" } // private profile, "E2E Tester"

async function signedIn(browser: Browser, user: { email: string; password: string }): Promise<Page> {
  const page = await (await browser.newContext()).newPage()
  await page.goto("/login")
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password").fill(user.password)
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
  return page
}

const serverAction = (page: Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

test("a high five in the feed reaches the friend, and can be taken back", async ({ browser }) => {
  test.slow()
  const tester = await signedIn(browser, TESTER)
  const demo = await signedIn(browser, DEMO)

  await tester.goto("/u/demo")
  const followed = serverAction(tester)
  await tester.getByRole("button", { name: "Follow", exact: true }).click()
  await followed

  try {
    await tester.goto("/friends")
    const five = () => tester.getByRole("button", { name: "High five to Demo User" }).first()
    await expect(five()).toHaveAttribute("aria-pressed", "false")
    const sent = serverAction(tester)
    await five().click()
    await sent
    await expect(five()).toHaveAttribute("aria-pressed", "true")
    // saved, not just optimistic
    await tester.reload()
    await expect(five()).toHaveAttribute("aria-pressed", "true")

    // the friend sees who — even though the sender's profile is private
    await demo.goto("/dashboard")
    await expect(demo.getByText("E2E Tester gave you a high five")).toBeVisible()

    // tap again: taken back
    const undone = serverAction(tester)
    await five().click()
    await undone
    await tester.reload()
    await expect(five()).toHaveAttribute("aria-pressed", "false")
    await demo.reload()
    await expect(demo.getByText("E2E Tester gave you a high five")).toHaveCount(0)
  } finally {
    await tester.goto("/u/demo")
    const unfollowed = serverAction(tester)
    await tester.getByRole("button", { name: "Following" }).click()
    await unfollowed
  }
})
