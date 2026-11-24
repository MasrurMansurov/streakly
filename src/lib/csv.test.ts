import { describe, expect, it } from "vitest"

import { toCsv } from "./csv"

describe("toCsv", () => {
  it("joins plain values", () => {
    expect(toCsv([["a", 1, null]])).toBe("a,1,\r\n")
  })
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv([['say "hi", ok', "two\nlines"]])).toBe('"say ""hi"", ok","two\nlines"\r\n')
  })
})
