import { expect, test } from "./helpers";

test.describe("Project CRUD", () => {
  test("create a new project and verify it appears in the list", async ({ page }) => {
    const name = `E2E Project ${Date.now()}`;

    await page.goto("/projects?create=true");
    await expect(page.getByRole("heading", { name: "New Project" })).toBeVisible();

    await page.locator("#name").fill(name);
    await page.getByRole("button", { name: "Create Project" }).click();

    // Sheet closes on success
    await expect(page.getByRole("heading", { name: "New Project" })).toBeHidden();

    // New project appears in the list
    await expect(page.getByRole("link", { name })).toBeVisible();
  });

  test("edit a project description", async ({ page }) => {
    await page.goto("/projects?edit=proj-gamma");
    await expect(page.getByRole("heading", { name: "Edit Project" })).toBeVisible();

    // Verify the correct project is loaded
    await expect(page.locator("#name")).toHaveValue("Gamma");

    // Update the description (use timestamp so isDirty is always true across runs)
    await page.locator("#description").fill(`Updated by E2E test ${Date.now()}`);
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Sheet closes on success
    await expect(page.getByRole("heading", { name: "Edit Project" })).toBeHidden();
  });

  test("create a project with Paused status", async ({ page }) => {
    const name = `E2E Paused ${Date.now()}`;

    await page.goto("/projects?create=true");
    await expect(page.getByRole("heading", { name: "New Project" })).toBeVisible();

    // Locate the Status field section, then click its trigger
    const statusField = page
      .locator("div")
      .filter({ hasText: /^Status$/ })
      .first();
    await statusField.getByRole("combobox").click();
    await page.getByRole("option", { name: "Paused" }).click();

    await page.locator("#name").fill(name);
    await page.getByRole("button", { name: "Create Project" }).click();

    // Sheet closes on success
    await expect(page.getByRole("heading", { name: "New Project" })).toBeHidden();

    // New project appears in the list with Paused lifecycle badge
    await expect(page.getByRole("link", { name })).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row.getByText("Paused")).toBeVisible();
  });

  test("edit project status from Active to Archived and back", async ({ page }) => {
    await page.goto("/projects?edit=proj-alpha");
    await expect(page.getByRole("heading", { name: "Edit Project" })).toBeVisible();
    await expect(page.locator("#name")).toHaveValue("Alpha");

    // Change status to Archived
    const statusField = page
      .locator("div")
      .filter({ hasText: /^Status$/ })
      .first();
    await statusField.getByRole("combobox").click();
    await page.getByRole("option", { name: "Archived" }).click();
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Sheet closes on success
    await expect(page.getByRole("heading", { name: "Edit Project" })).toBeHidden();

    // Verify Alpha now shows Archived in the table
    const row = page.getByRole("row").filter({ hasText: "Alpha" });
    await expect(row.getByText("Archived")).toBeVisible();

    // Revert Alpha back to Active for other tests
    await page.goto("/projects?edit=proj-alpha");
    await expect(page.getByRole("heading", { name: "Edit Project" })).toBeVisible();
    const statusField2 = page
      .locator("div")
      .filter({ hasText: /^Status$/ })
      .first();
    await statusField2.getByRole("combobox").click();
    await page.getByRole("option", { name: "Active" }).click();
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("heading", { name: "Edit Project" })).toBeHidden();
  });
});
