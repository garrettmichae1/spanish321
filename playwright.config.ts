import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:1420",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (process.env.CI ? undefined : "/usr/bin/chromium"),
      args: [
        "--no-sandbox",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run preview -- --port 1420",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
