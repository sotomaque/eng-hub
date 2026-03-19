import { expect, test } from "./helpers";

test.describe("Project glossary", () => {
  test("shows empty state when no entries exist", async ({ page }) => {
    await page.goto("/projects/proj-gamma/glossary");
    await expect(page.getByText(/no glossary entries yet/i)).toBeVisible();
  });

  test("shows Add Entry button", async ({ page }) => {
    await page.goto("/projects/proj-alpha/glossary");
    await expect(page.getByRole("button", { name: /add entry/i })).toBeVisible();
  });

  test("add, edit, and delete a glossary entry", async ({ page }) => {
    await page.goto("/projects/proj-alpha/glossary");

    // Add a new entry
    await page.getByRole("button", { name: /add entry/i }).click();
    await expect(page.getByRole("heading", { name: "Add Entry" })).toBeVisible();

    const term = `E2E Term ${Date.now()}`;
    await page.locator("#term").fill(term);
    await page.locator("#definition").fill("A definition written by the E2E test.");
    await page.getByRole("button", { name: "Add Entry" }).click();

    // Sheet closes and entry appears
    await expect(page.getByRole("heading", { name: "Add Entry" })).toBeHidden();
    await expect(page.getByText(term)).toBeVisible();
    await expect(page.getByText("A definition written by the E2E test.")).toBeVisible();

    // Edit the entry
    const entryRow = page.locator("div").filter({ hasText: term }).first();
    await entryRow.hover();
    await entryRow.getByRole("button", { name: /edit/i }).click();
    await expect(page.getByRole("heading", { name: "Edit Entry" })).toBeVisible();

    await page.locator("#definition").fill("An updated definition.");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("heading", { name: "Edit Entry" })).toBeHidden();
    await expect(page.getByText("An updated definition.")).toBeVisible();

    // Delete the entry
    await entryRow.hover();
    await entryRow.getByRole("button", { name: /delete/i }).click();

    await expect(page.getByText(term)).toBeHidden();
  });
});
