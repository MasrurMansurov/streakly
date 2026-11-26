#!/usr/bin/env node
/**
 * IndexNow: tell Bing, Yandex and the other IndexNow engines about every page
 * in the live sitemap (one request — they share submissions).
 *
 *   node scripts/indexnow.mjs              # submit
 *   node scripts/indexnow.mjs --dry-run    # only print what would be sent
 *
 * SITE_URL (default: the production URL) — the key file must be live at
 * <SITE_URL>/<key>.txt before engines accept the submission.
 */
const SITE = (process.env.SITE_URL ?? "https://streakly-pied-six.vercel.app").replace(/\/$/, "")
const KEY = "26cfe6cb41188849aa98efc345f4027b"
const dryRun = process.argv.includes("--dry-run")

const xml = await (await fetch(`${SITE}/sitemap.xml`)).text()
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
if (urlList.length === 0) throw new Error("no URLs in the sitemap")

// the key must be served as a plain file, or engines reject the batch
const keyRes = await fetch(`${SITE}/${KEY}.txt`)
if (!keyRes.ok || (await keyRes.text()).trim() !== KEY) throw new Error(`key file not live at ${SITE}/${KEY}.txt`)

const body = { host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }
if (dryRun) {
  console.log(`would submit ${urlList.length} URLs for ${body.host}`)
  process.exit(0)
}
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
})
// 200 = accepted, 202 = accepted, key validation pending
console.log(`IndexNow: ${res.status} for ${urlList.length} URLs`)
if (res.status !== 200 && res.status !== 202) process.exit(1)
