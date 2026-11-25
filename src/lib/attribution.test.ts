import { describe, expect, it } from "vitest"

import { attributionFrom, cleanTag } from "./attribution"

const visit = (search: string, referrer = "", path = "/en") => attributionFrom({ search, referrer, host: "streakly.app", path })

describe("attribution", () => {
  it("utm_source wins and is cleaned", () => {
    expect(visit("?utm_source=Habr&utm_medium=article")).toEqual({ source: "habr", landing: "/en" })
    expect(visit("?utm_source=<script>")).toEqual({ source: "script", landing: "/en" })
  })
  it("ref links (invites) are kept", () => {
    expect(visit("?ref=abc123")).toEqual({ source: "ref", ref: "abc123", landing: "/en" })
    expect(visit("?utm_source=telegram&ref=abc123")).toEqual({ source: "telegram", ref: "abc123", landing: "/en" })
  })
  it("known referrers get short names", () => {
    expect(visit("", "https://habr.com/ru/articles/1/")).toMatchObject({ source: "habr" })
    expect(visit("", "https://m.habr.com/")).toMatchObject({ source: "habr" })
    expect(visit("", "https://news.ycombinator.com/item?id=1")).toMatchObject({ source: "hn" })
    expect(visit("", "https://www.google.co.uk/")).toMatchObject({ source: "google" })
    expect(visit("", "https://ya.ru/")).toMatchObject({ source: "yandex" })
    expect(visit("", "https://t.co/xyz")).toMatchObject({ source: "x" })
  })
  it("unknown sites keep their host", () => {
    expect(visit("", "https://www.some-blog.dev/post")).toMatchObject({ source: "some-blog.dev" })
  })
  it("direct visits and own-site navigation are not a source", () => {
    expect(visit("")).toBeNull()
    expect(visit("", "https://streakly.app/en/login")).toBeNull()
    expect(visit("", "not a url")).toBeNull()
  })
  it("cleanTag limits length and characters", () => {
    expect(cleanTag("a".repeat(100))).toHaveLength(64)
    expect(cleanTag("  ")).toBeUndefined()
  })
})
