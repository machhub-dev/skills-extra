import { defineConfig } from "@playwright/test";

// PW_CHROMIUM_PATH points at a preinstalled Chromium; CI installs its own.
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "tests",
  use: { baseURL: "http://localhost:5199", ...(executablePath ? { launchOptions: { executablePath } } : {}) },
  // Never reuse a server: one left running from another checkout serves stale templates.
  webServer: { command: "npx vite --port 5199 --strictPort", port: 5199, reuseExistingServer: false },
});
