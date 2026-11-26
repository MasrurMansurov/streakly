import { expect, test, type Page } from "@playwright/test"

// Plan 2.5.1: steps inside a habit. All steps = a full check-in, some = mini
// (the streak goes on), none = nothing. One tap on the card still does it all.

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("demo@streakly.dev")
  await page.getByLabel("Password").fill("streakly-demo")
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

const serverAction = (page: Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers())

test("a habit with steps: partial = mini, all = done, one tap does everything", async ({ page }) => {
  test.setTimeout(90_000)
  await signIn(page)
  const name = `E2E steps ${Date.now()}`
  const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: name }) })
  const step = (title: string) => card.getByRole("checkbox", { name: new RegExp(`^${title}:`) })

  await page.getByRole("button", { name: "New habit" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Name").fill(name)
  for (const [i, title] of ["Water", "Stretch", "Shower"].entries()) {
    await dialog.getByRole("button", { name: "Add a step" }).click()
    await dialog.getByLabel(`Step ${i + 1}`, { exact: true }).fill(title)
  }
  await dialog.getByRole("button", { name: "Create habit" }).click()
  await expect(card).toBeVisible()

  try {
    await expect(card.getByText("0/3 steps")).toBeVisible()

    // one step → a mini check-in (the streak goes on)
    let saved = serverAction(page)
    await step("Water").click()
    await saved
    await expect(step("Water")).toHaveAttribute("aria-checked", "true")
    await page.reload()
    await expect(card.getByText("1/3 steps")).toBeVisible()
    await expect(card.getByText("mini", { exact: true })).toBeVisible()
    await expect(card.getByRole("button", { name: `Mark "${name}" as done today` })).toBeVisible()

    // all steps → done in full
    saved = serverAction(page)
    await step("Stretch").click()
    await saved
    saved = serverAction(page)
    await step("Shower").click()
    await saved
    await page.reload()
    await expect(card.getByText("3/3 steps")).toBeVisible()
    await expect(card.getByRole("button", { name: `Mark "${name}" as not done today` })).toBeVisible()

    // the steps fold away once everything is done — open them, untick one → back to mini
    await card.getByRole("button", { name: /3\/3 steps/ }).click()
    saved = serverAction(page)
    await step("Stretch").click()
    await saved
    await page.reload()
    await expect(card.getByText("2/3 steps")).toBeVisible()
    await expect(card.getByRole("button", { name: `Mark "${name}" as done today` })).toBeVisible()

    // one tap on the card: everything done; tap again: everything cleared
    saved = serverAction(page)
    await card.getByRole("button", { name: `Mark "${name}" as done today` }).click()
    await saved
    await page.reload()
    await expect(card.getByText("3/3 steps")).toBeVisible()
    saved = serverAction(page)
    await card.getByRole("button", { name: `Mark "${name}" as not done today` }).click()
    await saved
    await page.reload()
    await expect(card.getByText("0/3 steps")).toBeVisible()

    // edit: rename, reorder, remove — the steps keep their identity
    await card.getByRole("button", { name: "Habit actions" }).click()
    await page.getByRole("menuitem", { name: "Edit" }).click()
    const edit = page.getByRole("dialog")
    await expect(edit.getByLabel("Step 1", { exact: true })).toHaveValue("Water")
    await edit.getByLabel("Step 1", { exact: true }).fill("Glass of water")
    await edit.getByRole("button", { name: "Move “Shower” up" }).click()
    await edit.getByRole("button", { name: "Remove step “Stretch”" }).click()
    await edit.getByRole("button", { name: "Save", exact: true }).click()
    await expect(edit).toHaveCount(0)
    await expect(card.getByText("0/2 steps")).toBeVisible()
    await expect(card.getByRole("checkbox").nth(0)).toHaveAccessibleName(/^Glass of water:/)
    await expect(card.getByRole("checkbox").nth(1)).toHaveAccessibleName(/^Shower:/)
  } finally {
    await page.goto("/dashboard")
    await card.getByRole("button", { name: "Habit actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(card).toHaveCount(0)
  }
})
