import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { ACHIEVEMENTS } from "./achievements"

// The badge showcase is checked in the database (profiles_showcase_check).
// When a badge is added in code, the check must learn it too — otherwise
// saving a profile that shows the new badge fails.
describe("badge showcase check", () => {
  it("allows exactly the badges the app has", () => {
    const dir = join(process.cwd(), "supabase/migrations")
    const latest = readdirSync(dir)
      .filter((f) => f.endsWith(".sql") && /showcase\s*<@\s*array\[/i.test(readFileSync(join(dir, f), "utf8")))
      .sort()
      .at(-1)
    expect(latest).toBeDefined()
    const sql = readFileSync(join(dir, latest!), "utf8")
    const list = /showcase\s*<@\s*array\[([^\]]*)\]/i.exec(sql)![1]
    const inDb = [...list.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]).sort()
    expect(inDb).toEqual(ACHIEVEMENTS.map((a) => a.id).sort())
  })
})
