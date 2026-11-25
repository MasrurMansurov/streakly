import { expect, test } from "@playwright/test"

const serverAction = (page: import("@playwright/test").Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

// "My day ends at 3 a.m.": the setting applies from tomorrow, and switching back
// the same day cancels it. The time zone in use is shown next to it.
test("day start hour: from tomorrow, and can be switched back", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("tester@streakly.dev")
  await page.getByLabel("Password").fill("streakly-tester")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto("/settings")
  const group = page.getByRole("radiogroup", { name: "Start of your day" })
  await expect(group.getByRole("radio", { name: "00:00" })).toHaveAttribute("aria-checked", "true")
  await expect(page.getByText("A new day starts at 00:00. Time zone: Asia/Dushanbe.")).toBeVisible()

  try {
    let saved = serverAction(page)
    await group.getByRole("radio", { name: "03:00" }).click()
    await saved
    await expect(page.getByText("From tomorrow, a new day starts at 03:00")).toBeVisible()
    await expect(group.getByRole("radio", { name: "03:00" })).toHaveAttribute("aria-checked", "true")
    await expect(page.getByText(/^From .+, a new day starts at 03:00 — today finishes the old way/)).toBeVisible()

    // the setting survives a reload (it lives in the account, not the page)
    await page.reload()
    await expect(group.getByRole("radio", { name: "03:00" })).toHaveAttribute("aria-checked", "true")

    saved = serverAction(page)
    await group.getByRole("radio", { name: "00:00" }).click()
    await saved
    await expect(page.getByText("A new day starts at 00:00. Time zone: Asia/Dushanbe.")).toBeVisible()
  } finally {
    const midnight = group.getByRole("radio", { name: "00:00" })
    if ((await midnight.getAttribute("aria-checked")) !== "true") await midnight.click()
  }
})
