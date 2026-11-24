import { describe, expect, it } from "vitest"

import { asAccent, linkLabel, normalizeLink } from "./profile-style"

describe("profile style", () => {
  it("normalizes links to https and rejects the rest", () => {
    expect(normalizeLink("github.com/masrur")).toBe("https://github.com/masrur")
    expect(normalizeLink("https://t.me/masrur")).toBe("https://t.me/masrur")
    expect(normalizeLink("http://example.com")).toBeNull()
    expect(normalizeLink("javascript:alert(1)")).toBeNull()
    expect(normalizeLink("localhost")).toBeNull()
  })
  it("shows short link labels", () => {
    expect(linkLabel("https://www.github.com/masrur/")).toBe("github.com/masrur")
  })
  it("falls back to a safe preset", () => {
    expect(asAccent("neon")).toBe("emerald")
  })
})
