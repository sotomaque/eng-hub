import { expect, test } from "./helpers";

test.describe("Project Owners - Display", () => {
  test("Alpha overview shows owner with name", async ({ page }) => {
    await page.goto("/projects/proj-alpha");
    const main = page.locator("main");

    await expect(main.getByText("Owner:")).toBeVisible({ timeout: 15_000 });
    await expect(main.getByText("Alice Smith")).toBeVisible();
  });

  test("Alpha sidebar shows owner section", async ({ page }) => {
    await page.goto("/projects/proj-alpha");

    // The sidebar owner link uses data-slot="sidebar-menu-button"
    const sidebarOwnerLink = page
      .locator('[data-slot="sidebar-menu-button"]')
      .filter({ hasText: "Alice Smith" });
    await expect(sidebarOwnerLink).toBeVisible({ timeout: 15_000 });
  });

  test("Gamma project shows owner (Evan Chen)", async ({ page }) => {
    await page.goto("/projects/proj-gamma");
    const main = page.locator("main");

    await expect(main.getByText("Owner:")).toBeVisible({ timeout: 15_000 });
    await expect(main.getByText("Evan Chen")).toBeVisible();
  });

  test("Beta project has no owners section in sidebar", async ({ page }) => {
    await page.goto("/projects/proj-beta");
    // Wait for the sidebar to be rendered with the navigation
    await expect(
      page.getByRole("link", { name: "Overview", exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    // Owner group label should not be present (Beta has no owners in seed data)
    await expect(page.getByText("Owner", { exact: true })).toBeHidden();
  });
});

test.describe("Project Owners - CRUD", () => {
  test("edit project to add an owner via PersonMultiSelect", async ({
    page,
  }) => {
    // Open the edit sheet for Gamma (which already has Evan Chen as owner)
    await page.goto("/projects?edit=proj-gamma");
    await expect(
      page.getByRole("heading", { name: "Edit Project" }),
    ).toBeVisible();

    // The owners field should show "1 person assigned" (Evan Chen from seed)
    await expect(page.getByText("1 person assigned")).toBeVisible();

    // Open the person multi-select popover
    await page.getByText("1 person assigned").click();

    // Search for Bob and select him
    await page.getByPlaceholder("Search people…").fill("Bob");
    await page.getByRole("option", { name: /Bob Jones/ }).click();

    // Close the popover by clicking outside
    await page.keyboard.press("Escape");

    // Should now show "2 people assigned"
    await expect(page.getByText("2 people assigned")).toBeVisible();

    // Save changes
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Sheet closes on success
    await expect(
      page.getByRole("heading", { name: "Edit Project" }),
    ).toBeHidden();

    // Navigate to Gamma detail page and verify both owners are shown
    await page.goto("/projects/proj-gamma");
    const main = page.locator("main");
    await expect(main.getByText("Owners:")).toBeVisible({ timeout: 15_000 });
    await expect(main.getByText("Evan Chen")).toBeVisible();
    await expect(main.getByText("Bob Jones")).toBeVisible();
  });
});
