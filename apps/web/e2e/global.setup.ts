import path from "node:path";
import { fileURLToPath } from "node:url";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const adminAuthFile = path.join(__dirname, "../playwright/.clerk/user.json");
export const restrictedAuthFile = path.join(__dirname, "../playwright/.clerk/user2.json");

let clerkReady = false;
async function ensureClerk() {
  if (!clerkReady) {
    await clerkSetup();
    clerkReady = true;
  }
}

setup("authenticate admin", async ({ page }) => {
  await ensureClerk();

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
  await page.context().storageState({ path: adminAuthFile });
});

setup("authenticate restricted user", async ({ page }) => {
  const username = process.env.E2E_CLERK_USER_USERNAME_2;
  const password = process.env.E2E_CLERK_USER_PASSWORD_2;
  if (!username || !password) {
    return;
  }

  await ensureClerk();

  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: username,
      password,
    },
  });
  await page.goto("/projects");
  await page.waitForURL(/\/projects/);
  await page.context().storageState({ path: restrictedAuthFile });
});
