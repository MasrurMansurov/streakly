import { describe, expect, it } from "vitest"

import { isChunkError } from "./chunk-error"

describe("isChunkError", () => {
  it("recognizes chunk load failures from webpack, Turbopack and browsers", () => {
    const e = new Error("Loading chunk 4821 failed.\n(error: https://x/_next/static/chunks/4821.js)")
    e.name = "ChunkLoadError"
    expect(isChunkError(e)).toBe(true)
    expect(isChunkError(new TypeError("Failed to fetch dynamically imported module: https://x/_next/static/chunks/a.js"))).toBe(true)
    expect(isChunkError(new TypeError("Importing a module script failed."))).toBe(true) // Safari
    expect(isChunkError("Loading chunk app-pages-browser failed")).toBe(true)
  })
  it("ignores ordinary errors", () => {
    expect(isChunkError(new Error("Network request failed"))).toBe(false)
    expect(isChunkError(new TypeError("Cannot read properties of undefined"))).toBe(false)
    expect(isChunkError(undefined)).toBe(false)
  })
})
