import { expect, test } from "@playwright/test"

test.describe("Russian browser", () => {
  test.use({ locale: "ru-RU" })

  test("unprefixed URLs open in the browser's language", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/ru$/)
    await expect(page.locator("html")).toHaveAttribute("lang", "ru")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Привычки, которые")
  })

  test("login form validates in Russian", async ({ page }) => {
    await page.goto("/ru/login")
    await page.getByRole("button", { name: "Войти", exact: true }).last().click()
    await expect(page.getByText("Введите корректный email")).toBeVisible()
    await expect(page.getByText("Минимум 8 символов")).toBeVisible()
  })

  test("server errors come back in Russian for guests", async ({ page }) => {
    await page.goto("/ru/login")
    await page.getByLabel("Email").fill("demo@streakly.dev")
    await page.getByLabel("Пароль").fill("wrong-password-123")
    await page.getByRole("button", { name: "Войти", exact: true }).last().click()
    await expect(page.getByText("Неверный email или пароль")).toBeVisible()
  })

  test("dashboard uses Russian plurals and dates", async ({ page }) => {
    await page.goto("/ru/login")
    await page.getByLabel("Email").fill("demo@streakly.dev")
    await page.getByLabel("Пароль").fill("streakly-demo")
    await page.getByRole("button", { name: "Войти", exact: true }).last().click()
    await expect(page).toHaveURL(/\/ru\/dashboard$/)
    await expect(page.getByText("За 30 дней")).toBeVisible()
    // streaks like "15 дней", "3 дня", "1 день"
    await expect(page.getByText(/\d+ (день|дня|дней)/).first()).toBeVisible()
  })
})

test("language switcher keeps the current page", async ({ page }) => {
  await page.goto("/en/u/demo")
  await expect(page.getByText("Best streak")).toBeVisible()
  await page.getByRole("button", { name: "Language" }).click()
  await page.getByRole("menuitem", { name: "Русский" }).click()
  await expect(page).toHaveURL(/\/ru\/u\/demo$/)
  await expect(page.getByText("Рекорд серии")).toBeVisible()

  // the choice is remembered for unprefixed URLs
  await page.goto("/u/demo")
  await expect(page).toHaveURL(/\/ru\/u\/demo$/)
})

test("unknown pages show the localized not-found", async ({ page }) => {
  await page.goto("/ru/this-page-does-not-exist")
  await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible()
})
