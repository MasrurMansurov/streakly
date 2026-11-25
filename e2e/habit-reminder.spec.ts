import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

async function deleteHabit(page: Page, name: string) {
  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: name }) })
  await card.getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(card).toHaveCount(0)
}

// Per-habit reminder time (feedback from the Discord demo): set it, see it, clear it.
// Notifications are blocked here → saving says the reminder won't arrive (instead of silence).
test("a habit can have its own reminder time", async ({ page }) => {
  await signIn(page)

  const name = `E2E remind ${Date.now()}`
  await page.getByRole("button", { name: "or create your own" }).click()
  await page.getByLabel("Name").fill(name)
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/^Reminder/).fill("07:37")
  await expect(page.getByText("Saving turns on notifications on this device.")).toBeVisible()
  await page.getByRole("button", { name: "Create habit" }).click()
  await expect(page.getByText("Reminder saved, but it won't reach this device")).toBeVisible()

  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: name }) })
  await expect(card.getByText("07:37")).toBeVisible()

  // edit: the time is prefilled, clearing it removes the reminder
  await card.getByRole("button", { name: "Habit actions" }).click()
  await page.getByRole("menuitem", { name: "Edit" }).click()
  await expect(dialog.getByLabel(/^Reminder/)).toHaveValue("07:37")
  await dialog.getByRole("button", { name: "Clear" }).click()
  await dialog.getByRole("button", { name: "Save" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(card.getByText("07:37")).toHaveCount(0)

  await deleteHabit(page, name)
})

// Notifications allowed: saving a reminder time subscribes this device and turns
// reminders on — the whole chain a real reminder needs. The browser's push
// service is replaced by a stub (headless Chromium has none).
test("setting a reminder time turns notifications on for this device", async ({ page, context, baseURL }) => {
  await context.grantPermissions(["notifications"], { origin: new URL(baseURL!).origin })
  await page.addInitScript(() => {
    // headless Chromium keeps reporting "denied" even after the grant above
    Object.defineProperty(Notification, "permission", { get: () => "granted" })
    Notification.requestPermission = async () => "granted"
    // like a real browser, the subscription survives page loads
    const KEY = "e2e-fake-push"
    const make = (endpoint: string) => ({
      endpoint,
      toJSON: () => ({ endpoint, keys: { p256dh: "BE2E-test-p256dh-key-0000000000", auth: "e2e-auth-key-000" } }),
      unsubscribe: async () => (localStorage.removeItem(KEY), true),
    })
    PushManager.prototype.getSubscription = async () => {
      const endpoint = localStorage.getItem(KEY)
      return (endpoint ? make(endpoint) : null) as PushSubscription | null
    }
    PushManager.prototype.subscribe = async () => {
      const endpoint = `https://push.invalid/e2e-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(KEY, endpoint)
      return make(endpoint) as unknown as PushSubscription
    }
  })
  await signIn(page)

  const name = `E2E push ${Date.now()}`
  await page.getByRole("button", { name: "or create your own" }).click()
  await page.getByLabel("Name").fill(name)
  await page.getByRole("dialog").getByLabel(/^Reminder/).fill("07:43")
  await page.getByRole("button", { name: "Create habit" }).click()
  await expect(page.getByText("Notifications are on — we'll remind you at 07:43.")).toBeVisible()

  // Settings reflect it: reminders on, this device subscribed
  await page.goto("/settings", { waitUntil: "networkidle" })
  const toggle = page.getByRole("switch", { name: "Daily reminder" })
  await expect(toggle).toHaveAttribute("aria-checked", "true")
  await expect(page.getByText("This browser gets reminders")).toBeVisible()

  // reminder chime: on by default, the choice is remembered on this device
  const sound = page.getByRole("switch", { name: "Sound" })
  await expect(sound).toHaveAttribute("aria-checked", "true")
  await sound.click()
  await expect(sound).toHaveAttribute("aria-checked", "false")
  await page.reload()
  await expect(sound).toHaveAttribute("aria-checked", "false")
  await sound.click()
  await expect(sound).toHaveAttribute("aria-checked", "true")

  // clean up: switch reminders off (unsubscribes the device) and delete the habit
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-checked", "false")
  await page.goto("/dashboard")
  await deleteHabit(page, name)
})
