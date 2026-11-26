import { describe, expect, it } from "vitest"

import { normalizeDemoSource } from "./demo-source"

describe("normalizeDemoSource", () => {
  it("keeps known sources apart — the hero and the closing button are different", () => {
    expect(normalizeDemoSource("hero")).toBe("hero")
    expect(normalizeDemoSource("landing-cta")).toBe("landing-cta")
    expect(normalizeDemoSource("login")).toBe("login")
  })
  it("counts anything else as other", () => {
    expect(normalizeDemoSource(undefined)).toBe("other")
    expect(normalizeDemoSource("footer")).toBe("other")
    expect(normalizeDemoSource(42)).toBe("other")
  })
})
