import { expect, test } from "@playwright/test"

// SEO plan B: a free year-in-pixels tracker. Kept in this browser only.
test("year in pixels: paint a day, it survives a reload, a second tap clears it", async ({ page }) => {
  await page.goto("/en/year-in-pixels")
  await expect(page.getByRole("heading", { level: 1, name: "Year in pixels" })).toBeVisible()
  const sheet = page.locator("[data-print-sheet]")
  const day = sheet.getByRole("button", { name: /^January 5/ })

  await page.getByRole("button", { name: "Good", exact: true }).click()
  await day.click()
  await expect(day).toHaveAttribute("aria-pressed", "true")
  await expect(day).toHaveAccessibleName("January 5: Good")
  await expect(page.getByText("1 day colored")).toBeVisible()

  await page.reload()
  await expect(sheet.getByRole("button", { name: "January 5: Good" })).toHaveAttribute("aria-pressed", "true")

  await page.getByRole("button", { name: "Good", exact: true }).click()
  await sheet.getByRole("button", { name: "January 5: Good" }).click()
  await expect(sheet.getByRole("button", { name: /^January 5/ })).toHaveAttribute("aria-pressed", "false")

  // February has no 30th
  await expect(sheet.getByRole("button", { name: /^February 30/ })).toHaveCount(0)
  const pdf = await page.pdf({ format: "A4", printBackground: true })
  expect(pdf.byteLength).toBeGreaterThan(20_000)
})
