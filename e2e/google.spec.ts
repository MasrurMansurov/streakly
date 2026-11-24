import { expect, test } from "@playwright/test"

// Google is enabled in Supabase → the button shows up and starts the OAuth flow
test("Continue with Google leads to Google's sign-in", async ({ page }) => {
  await page.goto("/login")
  const google = page.getByRole("button", { name: "Continue with Google" })
  await expect(google).toBeVisible()
  await google.click()
  await page.waitForURL(/accounts\.google\.com/)
  expect(new URL(page.url()).hostname).toBe("accounts.google.com")
})
