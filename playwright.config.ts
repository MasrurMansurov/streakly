import { defineConfig, devices } from "@playwright/test"

// E2E_BASE_URL=https://... runs the suite against a deployed site instead of a local build
const externalBaseURL = process.env.E2E_BASE_URL
const PORT = 3100

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share the demo account
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: externalBaseURL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    timezoneId: "Asia/Dushanbe",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec\.ts/ },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npm run build && npm run start -- -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
})
