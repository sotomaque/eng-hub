import { expect, test } from "./helpers";

test.describe("Project Billets", () => {
  test.describe.configure({ mode: "serial" });

  test("navigate to billets page and see seeded billets", async ({ page }) => {
    await page.goto("/projects/proj-alpha");

    // Click the Billets sidebar link
    await page.getByRole("link", { name: "Billets" }).click();
    await page.waitForURL("**/projects/proj-alpha/billets");

    // Should see the billets card with seeded data
    await expect(page.locator('[data-slot="card-title"]')).toContainText("Billets");

    // 3 seeded billets → total 6 positions (3 + 2 + 1)
    await expect(page.getByText("6 positions")).toBeVisible();

    // Verify seeded billet rows are visible
    await expect(page.getByText("Engineering").first()).toBeVisible();
    await expect(page.getByText("Design")).toBeVisible();
  });

  test("create a new billet", async ({ page }) => {
    await page.goto("/projects/proj-alpha/billets");
    await expect(page.getByText(/\d+ positions/)).toBeVisible();

    // Click Add Billet
    await page.getByRole("link", { name: "Add Billet" }).click();

    // Sheet opens
    await expect(page.locator('[data-slot="sheet-title"]')).toContainText("Add Billet");

    // Select department — custom Combobox renders as a <Button> with placeholder text
    await page.getByRole("button", { name: "Select department..." }).click();
    await page.getByRole("option", { name: "Product" }).click();

    // Change level — Radix Select renders as role="combobox", default is "Mid"
    await page.locator('[data-slot="sheet-content"]').getByRole("combobox").click();
    await page.getByRole("option", { name: "Lead" }).click();

    // Set count
    await page.locator("#count").clear();
    await page.locator("#count").fill("4");

    // Submit
    await page.getByRole("button", { name: "Add Billet" }).click();

    // Sheet should close and new billet should appear
    await expect(page.locator('[data-slot="sheet-title"]')).toBeHidden();
    await expect(page.getByText("Product")).toBeVisible();
  });

  test("delete a billet", async ({ page }) => {
    await page.goto("/projects/proj-alpha/billets");
    await expect(page.getByText(/\d+ positions/)).toBeVisible();

    // Get initial position count
    const positionsText = page.getByText(/\d+ positions/);
    const initialText = await positionsText.textContent();

    // Click the first delete button
    await page.getByRole("button", { name: "Delete" }).first().click();

    // Confirm in the alert dialog (AlertDialogTitle is a heading)
    await expect(page.getByRole("heading", { name: "Delete billet?" })).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).last().click();

    // Wait for the dialog to close
    await expect(page.getByRole("heading", { name: "Delete billet?" })).toBeHidden();

    // Position count should have decreased
    await expect(positionsText).not.toHaveText(initialText ?? "");
  });

  test("billets page shows empty state for project without billets", async ({ page }) => {
    await page.goto("/projects/proj-gamma/billets");

    await expect(page.getByText("No billets defined yet.")).toBeVisible();
  });

  test("budget is displayed on project overview", async ({ page }) => {
    await page.goto("/projects/proj-alpha");

    // Alpha has a $2,500,000 budget (maximumFractionDigits: 0)
    await expect(page.getByText("$2,500,000")).toBeVisible();
  });
});
