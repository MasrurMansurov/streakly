// Streakly service worker: shows reminder notifications and opens the app on click.

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data && event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Streakly", {
      body: data.body || "Time to check in on your habits.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "streakly",
      renotify: true,
      data: { url: data.url || "/dashboard" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // focus an open Streakly tab if there is one
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin) {
          w.navigate(url)
          return w.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
