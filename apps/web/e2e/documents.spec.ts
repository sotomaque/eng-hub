import { expect, test } from "./helpers";

test.describe("Project documents", () => {
  test("documents page loads with empty state", async ({ page }) => {
    await page.goto("/projects/proj-alpha/documents");
    await expect(page.getByText(/no documents yet/i)).toBeVisible();
  });

  test("documents page shows Documents title", async ({ page }) => {
    await page.goto("/projects/proj-alpha/documents");
    await expect(page.locator("[data-slot='card-title']").first()).toBeVisible();
  });

  test("add document button is visible", async ({ page }) => {
    await page.goto("/projects/proj-alpha/documents");
    await expect(page.getByRole("button", { name: /add document/i })).toBeVisible();
  });

  test("clicking add document opens sheet", async ({ page }) => {
    await page.goto("/projects/proj-alpha/documents");
    await page.getByRole("button", { name: /add document/i }).click();
    await expect(page.getByText("Add Document")).toBeVisible();
    await expect(page.getByRole("button", { name: /choose file/i })).toBeVisible();
    await expect(page.getByLabel("Title")).toBeVisible();
    await expect(page.getByLabel("Description")).toBeVisible();
  });

  test("documents nav item appears in project sidebar", async ({ page }) => {
    await page.goto("/projects/proj-alpha");
    await expect(page.getByRole("link", { name: /documents/i })).toBeVisible();
  });

  test("sidebar documents link navigates to documents page", async ({ page }) => {
    await page.goto("/projects/proj-alpha");
    await page.getByRole("link", { name: /documents/i }).click();
    await page.waitForURL("**/documents");
    await expect(page.locator("[data-slot='card-title']").first()).toBeVisible();
  });
});
