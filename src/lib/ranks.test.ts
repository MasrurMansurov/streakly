import { describe, expect, it } from "vitest"

import { nextRank, rankFor } from "./ranks"

describe("ranks", () => {
  it("maps scores to ranks", () => {
    expect(rankFor(0).key).toBe("newcomer")
    expect(rankFor(20).key).toBe("apprentice")
    expect(rankFor(90).key).toBe("expert") // one daily habit, every day
    expect(rankFor(999).key).toBe("legend")
  })
  it("tells how far the next rank is", () => {
    expect(nextRank(85)).toMatchObject({ rank: { key: "expert" }, missing: 5 })
    expect(nextRank(300)).toBeNull()
  })
})
