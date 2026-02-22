import { expect, test } from "./helpers";

test.describe("Project CRUD", () => {
  test("create a new project and verify it appears in the list", async ({
    page,
  }) => {
    const name = `E2E Project ${Date.now()}`;

    await page.goto("/projects?create=true");
    await expect(
      page.getByRole("heading", { name: "New Project" }),
    ).toBeVisible();

    await page.locator("#name").fill(name);
    await page.getByRole("button", { name: "Create Project" }).click();

    // Sheet closes on success
    await expect(
      page.getByRole("heading", { name: "New Project" }),
    ).toBeHidden();

    // New project appears in the list
    await expect(page.getByRole("link", { name })).toBeVisible();
  });

  test("edit a project description", async ({ page }) => {
    await page.goto("/projects?edit=proj-gamma");
    await expect(
      page.getByRole("heading", { name: "Edit Project" }),
    ).toBeVisible();

    // Verify the correct project is loaded
    await expect(page.locator("#name")).toHaveValue("Gamma");

    // Update the description
    await page.locator("#description").fill("Updated by E2E test");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Sheet closes on success
    await expect(
      page.getByRole("heading", { name: "Edit Project" }),
    ).toBeHidden();
  });
});
