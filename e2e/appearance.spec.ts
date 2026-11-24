import { expect, test } from "@playwright/test"

const serverAction = (page: import("@playwright/test").Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

test("customize the profile look with a live preview", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto("/settings")
  const card = page.locator("#appearance")
  await card.getByRole("radio", { name: "ocean" }).click()
  await card.getByRole("radio", { name: "rose" }).click()
  await card.getByRole("radio", { name: "Ring" }).click()
  await card.getByLabel("Status").fill("Testing everything")
  await card.getByLabel("Pronouns").fill("they/them")

  // a bad link is rejected by the server
  await card.getByLabel("Links 1").fill("javascript:alert(1)")
  let saved = serverAction(page)
  await card.getByRole("button", { name: "Save look" }).click()
  await saved
  await expect(page.getByText(/isn't a valid https link/)).toBeVisible()

  await card.getByLabel("Links 1").fill("github.com/streakly-tester")
  // the preview updates live
  await expect(card.getByText("Testing everything")).toBeVisible()
  await expect(card.getByRole("link", { name: "github.com/streakly-tester" })).toBeVisible()
  saved = serverAction(page)
  await card.getByRole("button", { name: "Save look" }).click()
  await saved
  await expect(page.getByText("Profile look saved")).toBeVisible()

  try {
    await page.reload()
    await expect(card.getByLabel("Status")).toHaveValue("Testing everything")
    await expect(card.getByRole("radio", { name: "rose" })).toHaveAttribute("aria-checked", "true")
    await expect(card.getByRole("link", { name: "github.com/streakly-tester" })).toHaveAttribute("rel", /nofollow noopener noreferrer ugc/)
  } finally {
    // back to the defaults
    await card.getByRole("radio", { name: "aurora" }).click()
    await card.getByRole("radio", { name: "emerald" }).click()
    await card.getByRole("radio", { name: "None", exact: true }).first().click()
    await card.getByLabel("Status").fill("")
    await card.getByLabel("Pronouns").fill("")
    await card.getByLabel("Links 1").fill("")
    saved = serverAction(page)
    await card.getByRole("button", { name: "Save look" }).click()
    await saved
  }
})
