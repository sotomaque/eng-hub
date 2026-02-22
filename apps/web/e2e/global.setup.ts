import path from "node:path";
import { fileURLToPath } from "node:url";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const authFile = path.join(__dirname, "../playwright/.clerk/user.json");

setup("authenticate", async ({ page }) => {
  await clerkSetup();
  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: process.env.E2E_CLERK_USER_USERNAME ?? "",
      password: process.env.E2E_CLERK_USER_PASSWORD ?? "",
    },
  });
  await page.goto("/projects");
  await page.waitForURL(/\/projects/);
  await page.context().storageState({ path: authFile });
});
