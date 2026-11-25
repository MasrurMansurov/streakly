// Streakly service worker:
// - reminder / pact notifications (push) and opening the app on click
// - offline: static assets cache-first, pages network-first with the last
//   good copy as a fallback, so the app opens without a connection.
//   Check-ins made offline are queued by the page itself and sent later.

const CACHE = "streakly-v3"
const OFFLINE_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Streakly — offline</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafafa;color:#18181b;text-align:center;padding:24px}
@media(prefers-color-scheme:dark){body{background:#0a0a0a;color:#fafafa}}p{color:#71717a;max-width:320px}</style></head>
<body><div><h1>You're offline · Нет сети</h1><p>Open Streakly once while online and it will work offline next time.<br><br>Откройте Streakly один раз при подключении — и в следующий раз он заработает без сети.</p></div></body></html>`

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })()
  )
)

// the page asks to forget cached pages (sign-out, account deletion)
self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(caches.delete(CACHE))
})

// hashed chunks of old deploys pile up: keep the newest entries only
const MAX_ENTRIES = 300
async function trim(cache) {
  const keys = await cache.keys()
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(key)
}

const isStatic = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/") || /\.(?:svg|png|ico|woff2)$/.test(url.pathname)

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/_vercel/")) return

  if (isStatic(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const res = await fetch(request)
        if (res.ok) event.waitUntil(cache.put(request, res.clone()).then(() => trim(cache)))
        return res
      })
    )
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        try {
          const res = await fetch(request)
          if (res.ok && res.type === "basic" && !res.redirected) cache.put(request, res.clone())
          return res
        } catch {
          return (
            (await cache.match(request)) ||
            new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
          )
        }
      })()
    )
  }
})

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data && event.data.text() }
  }

  const tasks = [
    self.registration.showNotification(data.title || "Streakly", {
      body: data.body || "Time to check in on your habits.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "streakly",
      renotify: true,
      // one-tap check-in where supported (Chrome/Edge/Android, Firefox); others open the app
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : [],
      data: { url: data.url || "/dashboard", habitId: data.habitId || null, done: data.doneText || "✓" },
    }),
  ]
  // "N left today" on the app icon (installed PWA)
  if (typeof data.due === "number" && self.navigator.setAppBadge) {
    tasks.push((data.due > 0 ? self.navigator.setAppBadge(data.due) : self.navigator.clearAppBadge()).catch(() => {}))
  }
  event.waitUntil(Promise.all(tasks))
})

async function openApp(url) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  // focus an open Streakly tab if there is one
  for (const w of windows) {
    if (new URL(w.url).origin === self.location.origin) {
      await w.navigate(url)
      return w.focus()
    }
  }
  return self.clients.openWindow(url)
}

/** Check the habit in right from the notification — no app opening needed. */
async function checkInFromNotification(notification) {
  const { habitId, url, done } = notification.data || {}
  try {
    const res = await fetch("/api/checkin", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId }),
    })
    if (!res.ok) throw new Error(String(res.status))
    const { name, left } = await res.json()
    if (self.navigator.setAppBadge) {
      await (left > 0 ? self.navigator.setAppBadge(left) : self.navigator.clearAppBadge()).catch(() => {})
    }
    // tell open tabs to refresh their data
    for (const c of await self.clients.matchAll({ type: "window" })) c.postMessage({ type: "checked-in", habitId })
    await self.registration.showNotification(`${done} ${name}`, {
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: notification.tag,
      silent: true,
      data: { url },
    })
  } catch {
    // signed out, offline… → let the person finish in the app
    await openApp(new URL(url || "/dashboard", self.location.origin).href)
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  if (event.action === "checkin" && event.notification.data?.habitId) {
    event.waitUntil(checkInFromNotification(event.notification))
    return
  }
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href
  event.waitUntil(openApp(url))
})
