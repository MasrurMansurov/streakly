import { describe, expect, it } from "vitest"

import { countInRange } from "./pwned"

describe("countInRange", () => {
  const body = "0018A45C4D1DEF81644B54AB7F969B88D65:10\r\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2\r\n011053FD0102E94D6AE2F8B83D76FAF94F6:0\r\n"
  it("finds a leaked suffix and its count", () => {
    expect(countInRange(body, "00d4f6e8fa6eecad2a3aa415eec418d38ec")).toBe(2)
  })
  it("padding entries (count 0) and unknown suffixes are not leaks", () => {
    expect(countInRange(body, "011053FD0102E94D6AE2F8B83D76FAF94F6")).toBe(0)
    expect(countInRange(body, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")).toBe(0)
  })
})
