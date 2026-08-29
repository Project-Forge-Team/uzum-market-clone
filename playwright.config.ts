import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  reporter: "html",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
