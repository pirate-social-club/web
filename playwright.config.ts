import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const liveStagingEnabled = process.env.E2E_LIVE_STAGING === "true";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /.*\.live\.spec\.ts/u,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    ...(liveStagingEnabled
      ? [{
          name: "live-staging",
          testMatch: /.*\.live\.spec\.ts/u,
          use: {
            ...devices["Desktop Chrome"],
          },
        }]
      : []),
  ],
});
