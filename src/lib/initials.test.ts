import { describe, expect, it } from "vitest"

import { initials } from "./initials"

describe("initials", () => {
  it("takes the first letters of the first and last words", () => {
    expect(initials("Demo User")).toBe("DU")
    expect(initials("Chloé Dubois")).toBe("CD")
    expect(initials("Анна Мария Петрова")).toBe("АП")
  })
  it("uses one letter for a single word", () => {
    expect(initials("masrur")).toBe("M")
    expect(initials("élodie")).toBe("É")
  })
  it("splits handles and skips punctuation", () => {
    expect(initials("john_doe")).toBe("JD")
    expect(initials("  @alex  ")).toBe("A")
  })
  it("never returns an empty string", () => {
    expect(initials("")).toBe("?")
    expect(initials("  ")).toBe("?")
  })
})
