import { defineConfig, devices } from "@playwright/test";

// 4321 is Astro's dev-server default; an off-default port prevents stale
// astro dev processes from being mistaken for the Playwright preview server.
const port = Number(process.env.PLAYWRIGHT_PORT || 4322);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run build && python3 -m http.server ${port} --bind 127.0.0.1 --directory dist`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stderr: "ignore",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
