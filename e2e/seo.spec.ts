import { expect, test } from "@playwright/test"

// What search engines get: a self canonical, every language + x-default,
// noindex where a page has nothing to rank for, one address per profile.
const BOT = { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }

async function head(request: import("@playwright/test").APIRequestContext, path: string) {
  const res = await request.get(path, { headers: BOT, maxRedirects: 0 })
  const html = await res.text()
  const all = (re: RegExp) => [...html.matchAll(re)].map((m) => m[1])
  return {
    status: res.status(),
    canonical: all(/<link rel="canonical" href="([^"]+)"/g)[0],
    hreflang: Object.fromEntries([...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]])),
    robots: all(/<meta name="robots" content="([^"]+)"/g).join(" "),
    ogImage: all(/<meta property="og:image" content="([^"]+)"/g)[0],
    jsonLd: all(/<script type="application\/ld\+json">([^<]+)<\/script>/g).map((j) => JSON.parse(j)),
  }
}

test("public pages: self canonical, en/ru/x-default, a preview image", async ({ request }) => {
  for (const [path, xDefault] of [
    ["/en", "/"],
    ["/ru", "/"],
    ["/ru/leaderboard", "/en/leaderboard"],
    ["/en/demo", "/en/demo"],
    ["/en/privacy", "/en/privacy"],
    ["/ru/templates", "/en/templates"],
    ["/ru/templates/drink-water", "/en/templates/drink-water"],
    ["/en/habit-tracker-printable", "/en/habit-tracker-printable"],
  ] as const) {
    const h = await head(request, path)
    expect(h.status, path).toBe(200)
    expect(new URL(h.canonical!).pathname, path).toBe(path)
    const bare = path.replace(/^\/(en|ru)/, "")
    expect(new URL(h.hreflang.en).pathname, path).toBe(`/en${bare}`)
    expect(new URL(h.hreflang.ru).pathname, path).toBe(`/ru${bare}`)
    expect(new URL(h.hreflang["x-default"]).pathname, path).toBe(xDefault)
    expect(h.robots, path).not.toContain("noindex")
    expect(h.ogImage, path).toContain("opengraph-image")
  }
})

test("landing describes the app; profiles are ProfilePages with their own preview", async ({ request }) => {
  const landing = await head(request, "/en")
  const graph = landing.jsonLd[0]["@graph"] as { "@type": string; offers?: { price: string } }[]
  expect(graph.find((n) => n["@type"] === "WebApplication")?.offers?.price).toBe("0")

  const profile = await head(request, "/en/u/demo")
  expect(profile.jsonLd[0]["@type"]).toBe("ProfilePage")
  expect(profile.ogImage).toContain("/en/u/demo/opengraph-image")
})

test("nothing to rank for → noindex; one address per profile", async ({ request }) => {
  expect((await head(request, "/en/login")).robots).toContain("noindex")
  expect((await head(request, "/en/u/zzz-no-such-user")).robots).toContain("noindex")

  const upper = await request.get("/en/u/Demo", { headers: BOT, maxRedirects: 0 })
  expect(upper.status()).toBe(308)
  expect(upper.headers().location).toMatch(/\/en\/u\/demo$/)

  // search-console ownership files / the IndexNow key are served as files, never redirected
  expect((await request.get("/google0000000000000000.html", { maxRedirects: 0 })).status()).not.toBe(307)
})

test("the sitemap lists only indexable pages, with x-default", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text()
  expect(xml).toContain("/en/demo</loc>")
  expect(xml).toContain("/ru/templates/journaling</loc>")
  expect(xml).toContain('hreflang="x-default"')
  expect(xml).not.toContain("/login</loc>")
  expect(xml).not.toContain("/dashboard")
})
