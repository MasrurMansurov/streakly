import { describe, expect, it } from "vitest"

import { addDays, CHECKIN_WINDOW_DAYS, dateRange, isCheckInDateAllowed, todayIn } from "./dates"
import { habitStreak, weekStart } from "./streaks"

/** Timezone / midnight / DST matrix from the P0 audit. */
const at = (iso: string) => new Date(iso)

describe("todayIn — extreme timezones", () => {
  // 2026-11-25 10:30 UTC
  const now = at("2026-11-25T10:30:00Z")
  it("UTC+14 is already tomorrow", () => {
    expect(todayIn("Pacific/Kiritimati", now)).toBe("2026-11-26")
  })
  it("UTC−11 is still the same day", () => {
    expect(todayIn("Pacific/Pago_Pago", now)).toBe("2026-11-24")
  })
  it("UTC+14 and UTC−11 are two calendar days apart at the same instant", () => {
    const t = at("2026-11-25T11:30:00Z")
    expect(todayIn("Pacific/Kiritimati", t)).toBe("2026-11-26")
    expect(todayIn("Pacific/Pago_Pago", t)).toBe("2026-11-25")
  })
})

describe("todayIn — around local midnight", () => {
  // Moscow is UTC+3 (no DST)
  it("23:59 local is still today", () => {
    expect(todayIn("Europe/Moscow", at("2026-11-25T20:59:00Z"))).toBe("2026-11-25")
  })
  it("00:01 local is the next day, though UTC still says the previous one", () => {
    const t = at("2026-11-25T21:01:00Z")
    expect(todayIn("Europe/Moscow", t)).toBe("2026-11-26")
    expect(todayIn("UTC", t)).toBe("2026-11-25")
  })
})

describe("todayIn — DST days", () => {
  it("EU spring forward (23-hour day, 2026-03-29)", () => {
    // Berlin: 01:59 CET → 03:00 CEST
    expect(todayIn("Europe/Berlin", at("2026-03-28T22:59:00Z"))).toBe("2026-03-28") // 23:59 CET
    expect(todayIn("Europe/Berlin", at("2026-03-28T23:01:00Z"))).toBe("2026-03-29") // 00:01 CET
    expect(todayIn("Europe/Berlin", at("2026-03-29T21:59:00Z"))).toBe("2026-03-29") // 23:59 CEST
    expect(todayIn("Europe/Berlin", at("2026-03-29T22:01:00Z"))).toBe("2026-03-30") // 00:01 CEST
  })
  it("EU fall back (25-hour day, 2026-10-25)", () => {
    expect(todayIn("Europe/Berlin", at("2026-10-24T22:01:00Z"))).toBe("2026-10-25") // 00:01 CEST
    expect(todayIn("Europe/Berlin", at("2026-10-25T22:59:00Z"))).toBe("2026-10-25") // 23:59 CET
    expect(todayIn("Europe/Berlin", at("2026-10-25T23:01:00Z"))).toBe("2026-10-26")
  })
  it("US spring forward (2026-03-08) and fall back (2026-11-01)", () => {
    expect(todayIn("America/New_York", at("2026-03-08T04:59:00Z"))).toBe("2026-03-07") // 23:59 EST
    expect(todayIn("America/New_York", at("2026-03-08T05:01:00Z"))).toBe("2026-03-08")
    expect(todayIn("America/New_York", at("2026-11-02T03:59:00Z"))).toBe("2026-11-01") // 22:59 EST
    expect(todayIn("America/New_York", at("2026-11-02T05:01:00Z"))).toBe("2026-11-02")
  })
  it("calendar arithmetic ignores DST: every day is exactly one step", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29")
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30")
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26")
    expect(dateRange("2026-03-27", "2026-03-31")).toHaveLength(5)
  })
  it("a daily streak across both DST changes is unbroken", () => {
    const spring = new Set(dateRange("2026-03-20", "2026-04-05"))
    expect(habitStreak(spring, "2026-04-05").current).toBe(17)
    const fall = new Set(dateRange("2026-10-20", "2026-11-05"))
    expect(habitStreak(fall, "2026-11-05").current).toBe(17)
  })
})

describe("weeks are ISO (Monday first)", () => {
  it("week of a Sunday starts on the previous Monday", () => {
    expect(weekStart("2026-11-29")).toBe("2026-11-23") // Sunday
    expect(weekStart("2026-11-23")).toBe("2026-11-23") // Monday
  })
  it("ISO week 53 → week 1 across New Year", () => {
    expect(weekStart("2027-01-01")).toBe("2026-12-28")
    expect(weekStart("2027-01-03")).toBe("2026-12-28")
    expect(weekStart("2027-01-04")).toBe("2027-01-04")
  })
})

describe("isCheckInDateAllowed", () => {
  const today = "2026-11-25"
  it("allows today and the week strip", () => {
    expect(isCheckInDateAllowed(today, today)).toBe(true)
    expect(isCheckInDateAllowed("2026-11-19", today)).toBe(true) // first cell of the strip
    expect(isCheckInDateAllowed(addDays(today, -CHECKIN_WINDOW_DAYS), today)).toBe(true)
  })
  it("rejects the future and backdating", () => {
    expect(isCheckInDateAllowed("2026-11-26", today)).toBe(false)
    expect(isCheckInDateAllowed(addDays(today, -CHECKIN_WINDOW_DAYS - 1), today)).toBe(false)
    expect(isCheckInDateAllowed("2020-01-01", today)).toBe(false)
  })
  it("rejects malformed dates", () => {
    expect(isCheckInDateAllowed("2026-11-31", today)).toBe(false)
    expect(isCheckInDateAllowed("yesterday", today)).toBe(false)
  })
  it("offline: a tap at 23:50 sent at 00:10 keeps its day and is accepted", () => {
    const tappedOn = todayIn("Europe/Moscow", at("2026-11-25T20:50:00Z"))
    const serverToday = todayIn("Europe/Moscow", at("2026-11-25T21:10:00Z"))
    expect(tappedOn).toBe("2026-11-25")
    expect(serverToday).toBe("2026-11-26")
    expect(isCheckInDateAllowed(tappedOn, serverToday)).toBe(true)
  })
})
