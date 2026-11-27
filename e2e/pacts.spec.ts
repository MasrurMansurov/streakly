import { expect, test, type Browser, type Page } from "@playwright/test"

const DEMO = { email: "demo@streakly.dev", password: "streakly-demo" }
const TESTER = { email: "tester@streakly.dev", password: "streakly-tester" }

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

// 1×1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
)

const pactsCard = (page: Page) =>
  page.locator("[data-slot=card]", { has: page.locator("[data-slot=card-title]", { hasText: "Pacts" }) })

test("two friends start a pact, see each other's check-ins, then end it", async ({ browser }) => {
  test.slow()
  const tester = await signedIn(browser, TESTER)
  const demo = await signedIn(browser, DEMO)

  // tester: a habit to commit + follow demo
  await tester.getByRole("button", { name: /Drink 8 glasses of water/ }).click()
  await expect(tester.locator("section h3", { hasText: "Drink 8 glasses of water" })).toBeVisible()
  await tester.goto("/u/demo")
  const followed = serverAction(tester)
  await tester.getByRole("button", { name: "Follow", exact: true }).click()
  await followed
  await expect(tester.getByRole("button", { name: "Following" })).toHaveAttribute("aria-pressed", "true")

  try {
    // tester invites demo
    await tester.goto("/friends")
    await tester.getByRole("button", { name: /^Actions for Demo User/ }).click()
    await tester.getByRole("menuitem", { name: /Start a pact with/ }).click()
    await tester.getByRole("radio", { name: "Drink 8 glasses of water" }).click()
    await tester.getByRole("button", { name: "Send invite" }).click()
    await expect(tester.getByText("Invite sent")).toBeVisible()
    await expect(tester.getByText("In a pact")).toBeVisible()

    // demo accepts with one of their habits
    await demo.reload()
    const card = pactsCard(demo)
    await expect(card.getByText(/invites you to a pact — they commit to “Drink 8 glasses of water”/)).toBeVisible()
    await card.getByRole("radio", { name: "Read 10 pages" }).click()
    await card.getByRole("button", { name: "Accept" }).click()
    await expect(demo.getByText("Pact started. Good luck to you both.")).toBeVisible()
    // demo may or may not have checked in today already (other tests toggle it)
    await expect(card.getByText(/Your partner is waiting for you today\.|now it's .+'s turn\./)).toBeVisible()

    // tester checks in → demo sees it
    await tester.goto("/dashboard")
    const done = serverAction(tester)
    await tester.getByRole("button", { name: 'Mark "Drink 8 glasses of water" as done today' }).click()
    await done
    await demo.reload()
    // the partner's row (not demo's own) shows the check-in
    const partnerRow = pactsCard(demo)
      .getByRole("listitem")
      .filter({ hasNot: demo.getByRole("listitem") }) // the inner rows, not the whole pact
      .filter({ hasText: "E2E Tester" })
    await expect(partnerRow.getByText("done today")).toBeVisible()

    // tester shares a proof; demo sees it only after checking in today themselves
    await tester.reload()
    await pactsCard(tester).getByRole("button", { name: "Add proof" }).click()
    await tester.getByLabel("Take or choose a photo").setInputFiles({ name: "glass.png", mimeType: "image/png", buffer: PNG })
    await expect(tester.getByRole("dialog").locator("img")).toBeVisible() // compressed preview
    await tester.getByRole("dialog").getByLabel("Note", { exact: true }).fill("8 glasses by 6 pm")
    const shared = serverAction(tester)
    await tester.getByRole("button", { name: "Share with partner" }).click()
    await shared
    await expect(tester.getByText("Proof shared")).toBeVisible()

    await demo.reload()
    await expect(pactsCard(demo)).toBeVisible() // isVisible() below doesn't wait for the streamed page
    const demoCheckIn = demo.getByRole("button", { name: 'Mark "Read 10 pages" as done today' })
    if (await demoCheckIn.isVisible()) {
      await expect(pactsCard(demo).getByText("Check in to see their proof")).toBeVisible()
      await expect(pactsCard(demo).getByText("8 glasses by 6 pm")).toHaveCount(0)
      const checked = serverAction(demo)
      await demoCheckIn.click()
      await checked
      await demo.reload()
    }
    await expect(pactsCard(demo).getByText("8 glasses by 6 pm")).toBeVisible()
    const photo = pactsCard(demo).getByRole("button", { name: "Open photo" }).locator("img")
    await expect(photo).toBeVisible()
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0) // signed URL loads
  } finally {
    // clean up so the tester account is back to "no habits, follows nobody"
    await tester.goto("/dashboard")
    const card = pactsCard(tester)
    const end = card.getByRole("button", { name: "End pact" })
    const cancel = card.getByRole("button", { name: "Cancel invite" })
    await expect(tester.locator("section h3").first()).toBeVisible()
    if (await end.isVisible()) {
      await end.click()
      const ended = serverAction(tester)
      await tester.getByRole("dialog").getByRole("button", { name: "End pact" }).click()
      await ended
    } else if (await cancel.isVisible()) {
      const cancelled = serverAction(tester)
      await cancel.click()
      await cancelled
    }
    await expect(card).toHaveCount(0, { timeout: 15_000 })

    const habit = tester.locator("[data-slot=card]", { has: tester.locator("h3", { hasText: "Drink 8 glasses of water" }) })
    await habit.getByRole("button", { name: "Habit actions" }).click()
    await tester.getByRole("menuitem", { name: "Delete" }).click()
    await tester.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(tester.getByRole("button", { name: "or create your own" })).toBeVisible()

    await tester.goto("/u/demo")
    const unfollowed = serverAction(tester)
    await tester.getByRole("button", { name: "Following" }).click()
    await unfollowed
  }
})
