import { expect, test } from "@playwright/test"

test("privacy policy and terms are reachable from the footer and login", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Privacy" }).click()
  await expect(page).toHaveURL(/\/en\/privacy$/)
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Who processes your data" })).toBeVisible()

  await page.goto("/login")
  await page.getByRole("link", { name: "Terms of Use" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Terms of Use" })).toBeVisible()
})

test("legal pages are translated", async ({ page }) => {
  await page.goto("/ru/privacy")
  await expect(page.getByRole("heading", { level: 1, name: "Политика конфиденциальности" })).toBeVisible()
  await page.goto("/ru/terms")
  await expect(page.getByRole("heading", { level: 1, name: "Условия использования" })).toBeVisible()
})

test("robots.txt and sitemap.xml are served", async ({ request }) => {
  const robots = await request.get("/robots.txt")
  expect(robots.ok()).toBe(true)
  expect(await robots.text()).toContain("Sitemap:")
  const sitemap = await request.get("/sitemap.xml")
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).toContain("/ru/privacy")
})
