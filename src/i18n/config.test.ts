import { describe, expect, it } from "vitest"

import { localizePath, splitLocale } from "./config"

describe("localizePath", () => {
  it("prefixes app paths with the locale", () => {
    expect(localizePath("ru", "/")).toBe("/ru")
    expect(localizePath("en", "/dashboard")).toBe("/en/dashboard")
    expect(localizePath("en", "/settings#profile")).toBe("/en/settings#profile")
  })
  it("keeps a query or hash on the root without a trailing slash", () => {
    expect(localizePath("en", "/?home")).toBe("/en?home")
    expect(localizePath("ru", "/#faq")).toBe("/ru#faq")
  })
  it("leaves external links alone", () => {
    expect(localizePath("en", "https://github.com")).toBe("https://github.com")
  })
})

describe("splitLocale", () => {
  it("treats /en and /en/ as the landing page", () => {
    expect(splitLocale("/en")).toEqual({ locale: "en", path: "/" })
    expect(splitLocale("/en/")).toEqual({ locale: "en", path: "/" })
    expect(splitLocale("/ru/me")).toEqual({ locale: "ru", path: "/me" })
  })
})
