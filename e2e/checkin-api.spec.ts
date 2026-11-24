import { expect, test } from "@playwright/test"

test("one-tap check-in endpoint (used by notification buttons)", async ({ page, request }) => {
  // not signed in → 401
  const anon = await request.post("/api/checkin", { data: { habitId: "00000000-0000-0000-0000-000000000000" } })
  expect(anon.status()).toBe(401)

  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole("button", { name: /Meditate 10 minutes/ }).click()
  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: "Meditate 10 minutes" }) })
  await expect(card).toBeVisible()
  const habitId = (await card.getAttribute("id"))!.replace("habit-", "")

  try {
    // another site can't trigger it, even with the user's cookies
    const cross = await page.request.post("/api/checkin", { data: { habitId }, headers: { "sec-fetch-site": "cross-site" } })
    expect(cross.status()).toBe(403)

    const res = await page.request.post("/api/checkin", { data: { habitId } })
    expect(res.status()).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, name: "Meditate 10 minutes", left: 0 })

    await page.reload()
    await expect(page.getByRole("button", { name: 'Mark "Meditate 10 minutes" as not done today' })).toBeVisible()
  } finally {
    await card.getByRole("button", { name: "Habit actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(page.getByRole("button", { name: "or create your own" })).toBeVisible()
  }
})
