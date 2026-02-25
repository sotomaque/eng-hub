import { expect, test } from "./helpers";

test.describe("Health assessment CRUD", () => {
  test("create a new health assessment with overall status", async ({ page }) => {
    await page.goto("/projects/proj-alpha/health/new");
    await expect(page.getByRole("heading", { name: "New Health Assessment" })).toBeVisible();

    // Set overall status to Good (dimension accordions are collapsed)
    await page.getByRole("button", { name: "Good" }).first().click();

    // Submit
    await page.getByRole("button", { name: "Create Assessment" }).click();

    // Redirects back to the health page
    await page.waitForURL(/\/projects\/proj-alpha\/health$/);
    await expect(page.getByText("Latest Assessment")).toBeVisible();
  });
});
