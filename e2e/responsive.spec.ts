import { expect, test, type Page } from "@playwright/test"

// Every page fits a small phone (320px, touch → 44px touch targets on):
// no sideways scrolling, and nothing sticks out of a box that clips it.
// Intended horizontal scrollers (overflow-x: auto) are fine.

async function layoutProblems(page: Page): Promise<string[]> {
  await page.waitForTimeout(500) // late layout (fonts, streamed sections)
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const problems: string[] = []
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").split(" ").slice(0, 4).join(".")} «${(el.textContent ?? "").trim().slice(0, 30)}»`
    if (document.documentElement.scrollWidth > vw) problems.push(`page scrolls sideways: ${document.documentElement.scrollWidth}px > ${vw}px`)
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const parent = el.parentElement
      if (!parent) continue
      const ps = getComputedStyle(parent)
      const s = getComputedStyle(el)
      if (/(auto|scroll)/.test(ps.overflowX) || s.position === "absolute" || s.position === "fixed") continue
      const r = el.getBoundingClientRect()
      if (r.width <= 2 || r.height <= 2) continue // sr-only and the like
      const inner = parent.getBoundingClientRect().right - parseFloat(ps.paddingRight) - parseFloat(ps.borderRightWidth)
      if (r.right > inner + 2 && /(hidden|clip)/.test(ps.overflowX)) problems.push(`clipped by ${Math.round(r.right - inner)}px: ${describe(el)}`)
    }
    return problems.slice(0, 10)
  })
}

test.describe("on a 320px phone", () => {
  test.use({ viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true })

  for (const path of ["/ru", "/en", "/ru/login", "/ru/leaderboard", "/ru/privacy", "/ru/u/demo", "/ru/demo", "/ru/templates", "/ru/templates/workout", "/ru/habit-tracker-printable", "/ru/year-in-pixels"]) {
    test(`public page ${path} fits`, async ({ page }) => {
      await page.goto(path)
      expect(await layoutProblems(page)).toEqual([])
    })
  }

  test("signed-in pages and dialogs fit", async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto("/login")
    await page.getByLabel("Email").fill("demo@streakly.dev")
    await page.getByLabel("Password").fill("streakly-demo")
    await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
    await expect(page).toHaveURL(/\/dashboard$/)

    const problems: string[] = []
    for (const path of ["/ru/dashboard", "/en/dashboard", "/ru/progress", "/ru/friends", "/ru/settings", "/en/settings", "/ru/archive", "/ru/wrapped", "/ru/leaderboard"]) {
      await page.goto(path)
      await expect(page.locator("main").first()).toBeVisible()
      problems.push(...(await layoutProblems(page)).map((p) => `${path}: ${p}`))
    }
    // a habit page
    await page.goto("/ru/dashboard")
    const habit = await page.locator("a[href*='/habits/']").first().getAttribute("href")
    await page.goto(habit!)
    problems.push(...(await layoutProblems(page)).map((p) => `habit page: ${p}`))

    // dialogs
    await page.goto("/ru/dashboard")
    await page.getByRole("button", { name: "Новая привычка" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    problems.push(...(await layoutProblems(page)).map((p) => `new habit dialog: ${p}`))
    await page.keyboard.press("Escape")
    await page.goto("/ru/friends")
    await page.getByRole("button", { name: "Пригласить друга" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    problems.push(...(await layoutProblems(page)).map((p) => `invite dialog: ${p}`))

    expect(problems).toEqual([])
  })

  // the case that once widened the archive to 483px: a long name without spaces
  test("a long habit name doesn't widen Today or the archive", async ({ page }) => {
    test.setTimeout(90_000)
    const name = `Оченьдлинноеназваниепривычкибезпробелов${Date.now()}`.slice(0, 60)
    const card = page.locator("[data-slot=card]", { has: page.locator("h3", { hasText: name }) })
    await page.goto("/login")
    await page.getByLabel("Email").fill("demo@streakly.dev")
    await page.getByLabel("Password").fill("streakly-demo")
    await page.getByRole("button", { name: "Sign in", exact: true }).last().click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole("button", { name: "New habit" }).click()
    await page.getByLabel("Name").fill(name)
    await page.getByRole("button", { name: "Create habit" }).click()
    await expect(card).toBeVisible()
    try {
      expect(await layoutProblems(page)).toEqual([])
      await card.getByRole("button", { name: "Habit actions" }).click()
      await page.getByRole("menuitem", { name: "Archive" }).click()
      await expect(card).toHaveCount(0)
      await page.goto("/en/archive")
      await expect(page.locator("main li", { hasText: name })).toBeVisible()
      expect(await layoutProblems(page)).toEqual([])
    } finally {
      await page.goto("/en/archive")
      const row = page.locator("main li", { hasText: name })
      // count() doesn't wait for the list to render — wait first, or cleanup silently skips
      await row.waitFor({ timeout: 10_000 }).catch(() => {})
      if (await row.count()) {
        await row.getByRole("button", { name: `Delete “${name}”` }).click()
        await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click()
        await expect(row).toHaveCount(0)
      } else {
        await page.goto("/en/dashboard")
        if (await card.count()) {
          await card.getByRole("button", { name: "Habit actions" }).click()
          await page.getByRole("menuitem", { name: "Delete" }).click()
          await page.getByRole("button", { name: "Delete", exact: true }).click()
        }
      }
    }
  })
})
