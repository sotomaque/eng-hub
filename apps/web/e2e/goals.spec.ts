import { expect, test } from "./helpers";

// ── Display tests ──────────────────────────────────────────────────────────────
// These tests verify seeded goals and accomplishments appear on /people/[id].
// They run without a linked person record and always execute.

test.describe("Goals & Accomplishments display", () => {
  test("seeded goals appear on person profile", async ({ page }) => {
    await page.goto("/people/person-bob");
    await expect(page.getByText("Refactor auth module")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Increase test coverage to 80%")).toBeVisible();
  });

  test("status badges are visible on person profile", async ({ page }) => {
    await page.goto("/people/person-bob");
    await expect(page.getByText("In Progress")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Not Started")).toBeVisible();
  });

  test("seeded accomplishments appear on person profile", async ({ page }) => {
    await page.goto("/people/person-bob");
    await expect(page.getByText("Shipped API v2")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Reduced p99 latency by 40%")).toBeVisible();
  });

  test("goals section shows quarter badge", async ({ page }) => {
    await page.goto("/people/person-bob");
    await expect(page.getByText("Q1 2026").first()).toBeVisible({ timeout: 15_000 });
  });
});

// ── CRUD tests ─────────────────────────────────────────────────────────────────
// These tests exercise the /me/goals page for create, edit, and delete actions.
// They require E2E_CLERK_USER_ID to be set in the environment so that the seed
// links person-alice to the Clerk test user (enabling listMine to return data).

const E2E_CLERK_USER_ID = process.env.E2E_CLERK_USER_ID;

test.describe("Goals CRUD", () => {
  test("create a new goal", async ({ page }) => {
    test.skip(!E2E_CLERK_USER_ID, "Requires E2E_CLERK_USER_ID to link person record");

    const title = `E2E Goal ${Date.now()}`;

    await page.goto("/me/goals?addGoal=true");
    await expect(page.getByRole("heading", { name: "Add Goal" })).toBeVisible({ timeout: 15_000 });

    await page.locator("#title").fill(title);
    await page.getByRole("button", { name: "Add Goal" }).click();

    await expect(page.getByRole("heading", { name: "Add Goal" })).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });

  test("edit an existing goal", async ({ page }) => {
    test.skip(!E2E_CLERK_USER_ID, "Requires E2E_CLERK_USER_ID to link person record");

    const originalTitle = `E2E Edit Goal ${Date.now()}`;
    const updatedTitle = `${originalTitle} (updated)`;

    // Create a goal first
    await page.goto("/me/goals?addGoal=true");
    await expect(page.getByRole("heading", { name: "Add Goal" })).toBeVisible({ timeout: 15_000 });
    await page.locator("#title").fill(originalTitle);
    await page.getByRole("button", { name: "Add Goal" }).click();
    await expect(page.getByRole("heading", { name: "Add Goal" })).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(originalTitle)).toBeVisible({ timeout: 15_000 });

    // Click the edit button for that goal row
    const goalRow = page.locator("div").filter({ hasText: originalTitle }).first();
    await goalRow.getByRole("button", { name: "Edit" }).click();

    await expect(page.getByRole("heading", { name: "Edit Goal" })).toBeVisible({ timeout: 15_000 });
    await page.locator("#title").clear();
    await page.locator("#title").fill(updatedTitle);
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("heading", { name: "Edit Goal" })).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(originalTitle)).toBeHidden();
  });

  test("delete a goal", async ({ page }) => {
    test.skip(!E2E_CLERK_USER_ID, "Requires E2E_CLERK_USER_ID to link person record");

    const title = `E2E Delete Goal ${Date.now()}`;

    // Create a goal to delete
    await page.goto("/me/goals?addGoal=true");
    await expect(page.getByRole("heading", { name: "Add Goal" })).toBeVisible({ timeout: 15_000 });
    await page.locator("#title").fill(title);
    await page.getByRole("button", { name: "Add Goal" }).click();
    await expect(page.getByRole("heading", { name: "Add Goal" })).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });

    // Open the delete dialog
    const goalRow = page.locator("div").filter({ hasText: title }).first();
    await goalRow.getByRole("button", { name: "Delete" }).click();

    // Confirm in the AlertDialog
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(title)).toBeHidden({ timeout: 15_000 });
  });
});

test.describe("Accomplishments CRUD", () => {
  test("create a new accomplishment", async ({ page }) => {
    test.skip(!E2E_CLERK_USER_ID, "Requires E2E_CLERK_USER_ID to link person record");

    const title = `E2E Accomplishment ${Date.now()}`;

    await page.goto("/me/goals?addAccomplishment=true");
    await expect(page.getByRole("heading", { name: "Log Win" })).toBeVisible({ timeout: 15_000 });

    await page.locator("#title").fill(title);
    await page.getByRole("button", { name: "Log Win" }).click();

    await expect(page.getByRole("heading", { name: "Log Win" })).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });

  test("delete an accomplishment", async ({ page }) => {
    test.skip(!E2E_CLERK_USER_ID, "Requires E2E_CLERK_USER_ID to link person record");

    const title = `E2E Delete Accomplishment ${Date.now()}`;

    // Create one to delete
    await page.goto("/me/goals?addAccomplishment=true");
    await expect(page.getByRole("heading", { name: "Log Win" })).toBeVisible({ timeout: 15_000 });
    await page.locator("#title").fill(title);
    await page.getByRole("button", { name: "Log Win" }).click();
    await expect(page.getByRole("heading", { name: "Log Win" })).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });

    // Open the delete dialog
    const row = page.locator("div").filter({ hasText: title }).first();
    await row.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(title)).toBeHidden({ timeout: 15_000 });
  });
});
