import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { test as setup } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const adminAuthFile = path.join(__dirname, "../playwright/.clerk/user.json");
export const restrictedAuthFile = path.join(__dirname, "../playwright/.clerk/user2.json");

const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? "clerk";

async function clerkAuth(
  page: Page,
  identifier: string,
  password: string,
  storageStatePath: string,
) {
  const { clerk, clerkSetup } = await import("@clerk/testing/playwright");
  await clerkSetup();

  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: { strategy: "password", identifier, password },
  });
  await page.goto("/projects");
  await page.waitForURL(/\/projects/);
  await page.context().storageState({ path: storageStatePath });
}

setup("authenticate admin", async ({ page }) => {
  if (AUTH_PROVIDER === "test") {
    return;
  }

  await clerkAuth(
    page,
    process.env.E2E_CLERK_USER_USERNAME ?? "",
    process.env.E2E_CLERK_USER_PASSWORD ?? "",
    adminAuthFile,
  );
});

setup("authenticate restricted user", async ({ page }) => {
  if (AUTH_PROVIDER === "test") {
    return;
  }

  const username = process.env.E2E_CLERK_USER_USERNAME_2;
  const password = process.env.E2E_CLERK_USER_PASSWORD_2;
  if (!username || !password) {
    return;
  }

  await clerkAuth(page, username, password, restrictedAuthFile);
});
