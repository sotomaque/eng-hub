import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, ".env") });

const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? "clerk";
const isTestAuth = AUTH_PROVIDER === "test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    ...(isTestAuth
      ? []
      : [
          {
            name: "setup" as const,
            testMatch: /global\.setup\.ts/,
          },
        ]),
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(isTestAuth
          ? {}
          : { storageState: path.join(__dirname, "playwright/.clerk/user.json") }),
      },
      testIgnore: /abac\.spec\.ts/,
      ...(isTestAuth ? {} : { dependencies: ["setup"] }),
    },
    {
      name: "restricted",
      use: {
        ...devices["Desktop Chrome"],
        ...(isTestAuth
          ? {}
          : { storageState: path.join(__dirname, "playwright/.clerk/user2.json") }),
      },
      testMatch: /abac\.spec\.ts/,
      ...(isTestAuth ? {} : { dependencies: ["setup"] }),
    },
  ],

  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120 * 1000,
      },
});
