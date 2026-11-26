import { describe, expect, it } from "vitest"

import { sectionOf } from "./nav"

describe("sectionOf", () => {
  it("maps every app page to one section", () => {
    expect(sectionOf("/dashboard")).toBe("today")
    expect(sectionOf("/habits/123")).toBe("today")
    expect(sectionOf("/progress")).toBe("progress")
    expect(sectionOf("/friends")).toBe("friends")
    expect(sectionOf("/leaderboard")).toBe("friends")
    expect(sectionOf("/me")).toBe("me")
    expect(sectionOf("/archive")).toBe("me")
    expect(sectionOf("/settings")).toBe("me")
    expect(sectionOf("/wrapped")).toBe("me")
  })
  it("leaves public pages and look-alike paths alone", () => {
    expect(sectionOf("/")).toBeNull()
    expect(sectionOf("/templates")).toBeNull()
    expect(sectionOf("/u/demo")).toBeNull()
    expect(sectionOf("/dashboards")).toBeNull()
    expect(sectionOf("/meetings")).toBeNull()
  })
})
