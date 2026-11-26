import { expect, test } from "@playwright/test"

// SEO plan B1: a free printable habit tracker people search for.
test("printable tracker: your habits on the sheet, and the PDF isn't blank", async ({ page }) => {
  await page.goto("/en/habit-tracker-printable")
  await expect(page.getByRole("heading", { level: 1, name: "Printable habit tracker" })).toBeVisible()

  await page.getByLabel("Habits (one per line, up to 12)").fill("Meditate\nJournal")
  await page.getByLabel("Title").fill("December goals")
  const sheet = page.locator("[data-print-sheet]")
  await expect(sheet.getByRole("heading", { name: "December goals" })).toBeVisible()
  await expect(sheet.getByRole("rowheader", { name: "Meditate" })).toBeVisible()
  await expect(sheet.getByRole("rowheader", { name: "Journal" })).toBeVisible()
  // blank rows to write in by hand: 2 habits + 6 empty = 8
  await expect(sheet.locator("tbody tr")).toHaveCount(8)

  // print CSS shows only the sheet — a regression once made the printout empty
  const pdf = await page.pdf({ landscape: true, format: "A4", printBackground: true })
  expect(pdf.byteLength).toBeGreaterThan(20_000)
})
