const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e/specs",
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 1100 },
  },
  webServer: {
    command: "PORT=3100 BROWSER=none REACT_APP_E2E=1 npm start",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
