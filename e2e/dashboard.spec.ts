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
  await expect(page).toHaveURL(/\/en$/)
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login$/)
})

test("archive, undo, archive again and restore from the archive page", async ({ page }) => {
  const name = `E2E archive ${Date.now()}`
  const cardOf = (n: string) => page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: n }) })

  await page.getByRole("button", { name: "New habit" }).click()
  await page.getByLabel("Name").fill(name)
  await page.getByRole("button", { name: "Create habit" }).click()
  await expect(cardOf(name)).toBeVisible()

  // archive → undo from the toast
  await cardOf(name).getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Archive" }).click()
  await expect(cardOf(name)).toHaveCount(0)
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(cardOf(name)).toBeVisible()

  // archive → restore from /archive
  await cardOf(name).getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Archive" }).click()
  await expect(cardOf(name)).toHaveCount(0)
  await page.getByRole("link", { name: /archived habit/ }).click()
  await expect(page).toHaveURL(/\/archive$/)
  const row = page.locator("main li", { hasText: name }) // toasts are <li> too, outside <main>
  await row.getByRole("button", { name: "Restore" }).click()
  await expect(row).toHaveCount(0)

  // clean up
  await page.goto("/dashboard")
  await cardOf(name).getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(cardOf(name)).toHaveCount(0)
})

test("habit page shows history and stats", async ({ page }) => {
  await page.getByRole("link", { name: "Read 10 pages" }).click()
  await expect(page).toHaveURL(/\/habits\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { name: "Read 10 pages" })).toBeVisible()
  await expect(page.getByText("Last 12 months")).toBeVisible()
  await expect(page.getByText("By weekday")).toBeVisible()
  await expect(page.getByText("Current streak", { exact: true })).toBeVisible()
})

test("unknown habit id shows not found", async ({ page }) => {
  await page.goto("/habits/00000000-0000-0000-0000-000000000000")
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()
})

// 1×1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
)

test("upload and remove a profile photo", async ({ page }) => {
  await page.goto("/settings", { waitUntil: "networkidle" }) // wait for hydration before using the file input
  await withServerAction(page, () =>
    page.getByLabel("Upload profile photo").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG })
  )
  await expect(page.getByText("Avatar updated")).toBeVisible()
  await expect(page.locator("header img")).toHaveAttribute("src", /\/storage\/v1\/object\/public\/avatars\//)

  await withServerAction(page, () => page.getByRole("button", { name: "Remove" }).click())
  await expect(page.getByText("Avatar removed")).toBeVisible()
  await expect(page.locator("header img")).toHaveCount(0)
})

test("rejects non-image files before uploading", async ({ page }) => {
  await page.goto("/settings", { waitUntil: "networkidle" })
  await page.getByLabel("Upload profile photo").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") })
  await expect(page.getByText("Use a PNG, JPG, WebP or GIF image")).toBeVisible()
})

test("settings show the reminders card", async ({ page }) => {
  await page.goto("/settings", { waitUntil: "networkidle" })
  await expect(page.getByText("Reminders", { exact: true })).toBeVisible()
  await expect(page.getByRole("switch", { name: "Daily reminder" })).toBeVisible()
  await expect(page.getByRole("radio", { name: /Evening/ })).toHaveAttribute("aria-checked", "true")
  await expect(page.getByLabel("Or pick a time")).toHaveValue("20:00")
})
