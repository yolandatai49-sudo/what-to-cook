import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
const localChrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROME
        ? { executablePath: process.env.PLAYWRIGHT_CHROME }
        : existsSync(localChrome)
          ? { executablePath: localChrome }
          : {}),
    },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: "iphone-layout",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
