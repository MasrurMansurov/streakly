import { expect, test, type Browser, type Page } from "@playwright/test"

async function signedIn(browser: Browser, email: string, password: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage()
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
  return page
}

const serverAction = (page: Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

const challengesCard = (page: Page) => page.locator("#challenges")

test("a weekly challenge with a stake: invite, join, standings", async ({ browser }) => {
  test.slow()
  const tester = await signedIn(browser, "tester@streakly.dev", "streakly-tester")
  const demo = await signedIn(browser, "demo@streakly.dev", "streakly-demo")

  await tester.getByRole("button", { name: /Walk 20 minutes/ }).click()
  await expect(tester.locator("section h3", { hasText: "Walk 20 minutes" })).toBeVisible()
  await tester.goto("/u/demo")
  let saved = serverAction(tester)
  await tester.getByRole("button", { name: "Follow", exact: true }).click()
  await saved

  try {
    await tester.goto("/friends")
    await challengesCard(tester).getByRole("button", { name: "New challenge" }).click()
    const dialog = tester.getByRole("dialog")
    await dialog.getByRole("button", { name: "Steps duel" }).click()
    await dialog.getByRole("button", { name: "Loser buys coffee" }).click()
    await dialog.getByRole("radio", { name: "Walk 20 minutes" }).click()
    await dialog.getByRole("checkbox", { name: /Demo User/ }).click()
    await dialog.getByRole("button", { name: "Start challenge" }).click()
    await expect(tester.getByText("Challenge started — invites sent")).toBeVisible()
    await expect(challengesCard(tester).getByText("Steps duel")).toBeVisible()
    await expect(challengesCard(tester).getByText("Loser buys coffee")).toBeVisible()

    // demo is invited on the Today screen and joins with one of their habits
    await demo.reload()
    // demo may have other invites (real people use the demo account) — use the tester's one
    const invite = challengesCard(demo).getByRole("listitem").filter({ hasText: "E2E Tester invited you" })
    await expect(invite).toBeVisible()
    await invite.getByRole("radio", { name: "Read 10 pages" }).click()
    saved = serverAction(demo)
    await invite.getByRole("button", { name: "Join" }).click()
    await saved
    await expect(demo.getByText("You're in. Good luck.")).toBeVisible()
    const standings = challengesCard(demo)
      .getByRole("listitem")
      .filter({ has: demo.getByRole("list", { name: "Steps duel" }) })
      .filter({ hasText: "E2E Tester" })
      .getByRole("list", { name: "Steps duel" })
    await expect(standings.getByRole("listitem")).toHaveCount(2)

    // tester checks in → a point and a tick in the standings
    await tester.goto("/dashboard")
    saved = serverAction(tester)
    await tester.getByRole("button", { name: 'Mark "Walk 20 minutes" as done today' }).click()
    await saved
    await demo.reload()
    const testerRow = standings.getByRole("listitem").filter({ hasText: "E2E Tester" })
    await expect(testerRow.getByText(/^1\/7$/)).toBeVisible()
    await expect(testerRow.getByLabel("done today")).toBeVisible()
  } finally {
    // delete every challenge the tester owns (also leftovers of earlier failed runs)
    await tester.goto("/friends")
    await expect(challengesCard(tester)).toBeVisible()
    const del = challengesCard(tester).getByRole("button", { name: "Delete", exact: true })
    for (let n = await del.count(); n > 0; n = await del.count()) {
      await del.first().click()
      const done = serverAction(tester)
      await tester.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click()
      await done
      await expect(del).toHaveCount(n - 1)
    }
    await tester.goto("/dashboard")
    const habit = tester.locator("[data-slot=card]", { has: tester.locator("h3", { hasText: "Walk 20 minutes" }) })
    await habit.getByRole("button", { name: "Habit actions" }).click()
    await tester.getByRole("menuitem", { name: "Delete" }).click()
    await tester.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(tester.getByRole("button", { name: "or create your own" })).toBeVisible()
    await tester.goto("/u/demo")
    saved = serverAction(tester)
    await tester.getByRole("button", { name: "Following" }).click()
    await saved
  }
})
