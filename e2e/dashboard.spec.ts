import { expect, test, type Page } from "@playwright/test"

// Uses the public demo account. Every test restores the state it changes.
const DEMO = { email: "demo@streakly.dev", password: "streakly-demo" }

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(DEMO.email)
  await page.getByLabel("Password").fill(DEMO.password)
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
  // habit cards stream in behind <Suspense>
  await expect(page.locator("section h3").first()).toBeVisible()
}

const habitTitles = (page: Page) => page.locator("section h3").allTextContents()

/** Runs `fn` and waits until the server action it triggers has responded. */
async function withServerAction(page: Page, fn: () => Promise<unknown>) {
  const done = page.waitForResponse(
    (r) => r.request().method() === "POST" && "next-action" in r.request().headers()
  )
  await fn()
  await done
}

/** dnd-kit measures layout between key presses, so give it a frame or two */
async function keyboardMove(page: Page, habit: string, key: "ArrowLeft" | "ArrowRight") {
  await page.getByRole("button", { name: `Reorder “${habit}”` }).focus()
  for (const k of ["Space", key, "Space"]) {
    await page.keyboard.press(k)
    await page.waitForTimeout(250)
  }
}

test.beforeEach(async ({ page }) => {
  await signIn(page)
})

test("dashboard shows habits and stats", async ({ page }) => {
  await expect(page.locator("section h3")).toHaveCount(4)
  await expect(page.getByText("30-day completion")).toBeVisible()
  await expect(page.getByText("Activity", { exact: true })).toBeVisible()
})

test("check-in for today toggles and persists", async ({ page }) => {
  const button = page.getByRole("button", { name: /"Read 10 pages" as (not )?done today/ })
  const before = await button.getAttribute("aria-pressed")
  const after = before === "true" ? "false" : "true"

  await withServerAction(page, async () => {
    await button.click()
    await expect(button).toHaveAttribute("aria-pressed", after) // optimistic
  })
  await page.reload()
  await expect(button).toHaveAttribute("aria-pressed", after) // saved

  await withServerAction(page, async () => {
    await button.click() // restore
    await expect(button).toHaveAttribute("aria-pressed", before!)
  })
  await page.reload()
  await expect(button).toHaveAttribute("aria-pressed", before!)
})

test("habits can be reordered with the keyboard", async ({ page }) => {
  const original = await habitTitles(page)

  await withServerAction(page, () => keyboardMove(page, original[0], "ArrowRight"))
  await expect(page.getByText(`${original[0]} dropped at position 2`)).toBeAttached()
  await expect.poll(() => habitTitles(page)).toEqual([original[1], original[0], ...original.slice(2)])

  await page.reload()
  await expect.poll(() => habitTitles(page)).toEqual([original[1], original[0], ...original.slice(2)])

  // restore
  await withServerAction(page, () => keyboardMove(page, original[0], "ArrowLeft"))
  await expect.poll(() => habitTitles(page)).toEqual(original)
  await page.reload()
  await expect.poll(() => habitTitles(page)).toEqual(original)
})

test("create, edit and delete a habit", async ({ page }) => {
  const name = `E2E habit ${Date.now()}`

  await page.getByRole("button", { name: "New habit" }).click()
  await page.getByLabel("Name").fill(name)
  await page.getByRole("radio", { name: "3 times a week" }).click()
  await page.getByRole("radio", { name: "violet" }).click()
  await page.getByRole("button", { name: "Create habit" }).click()
  await expect(page.locator("section h3", { hasText: name })).toBeVisible()
  const created = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: name }) })
  await expect(created.getByText("0/3 this week")).toBeVisible()

  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: name }) })
  await card.getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Edit" }).click()
  await page.getByLabel("Name").fill(`${name} (edited)`)
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.locator("section h3", { hasText: `${name} (edited)` })).toBeVisible()

  const edited = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: `${name} (edited)` }) })
  await edited.getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.locator("section h3", { hasText: name })).toHaveCount(0)
})

test("settings show the profile and sign out works", async ({ page }) => {
  await page.goto("/settings")
  await expect(page.getByLabel("Username")).toHaveValue("demo")
  await page.getByRole("button", { name: "Account menu" }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login$/)
})
