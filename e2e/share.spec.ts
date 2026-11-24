import { expect, test } from "@playwright/test"

test("share card: image for each period and Wordle-style text", async ({ page }) => {
  // signed out → no card
  expect((await page.request.get("/api/share-card?period=week")).status()).toBe(401)

  await page.goto("/login")
  await page.getByLabel("Email").fill("demo@streakly.dev")
  await page.getByLabel("Password").fill("streakly-demo")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.getByRole("button", { name: "Share" }).first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("img", { name: /Streakly progress card: Week/ })).toBeVisible()
  await dialog.getByRole("radio", { name: "Year" }).click()
  const year = dialog.getByRole("img", { name: /Streakly progress card: Year/ })
  await expect(year).toBeVisible()
  await expect.poll(() => year.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1080)

  const png = await page.request.get("/api/share-card?period=month&locale=ru")
  expect(png.headers()["content-type"]).toBe("image/png")
  const text = await (await page.request.get("/api/share-card?period=month&locale=ru&format=text")).text()
  expect(text).toMatch(/^Streakly · Мой /)
  expect(text).toMatch(/[🟩🟨⬜]/u)
})
