import type { MetadataRoute } from "next"

/** Makes Streakly installable ("Add to Home Screen") and open full-screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Streakly — habit tracker",
    short_name: "Streakly",
    description: "Track daily habits and keep your streaks alive.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10b981",
    categories: ["productivity", "lifestyle", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Today's habits", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  }
}
