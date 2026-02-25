import { expect, test } from "./helpers";

test.describe("Health assessments", () => {
  test("health page shows seeded assessments", async ({ page }) => {
    await page.goto("/projects/proj-alpha/health");
    await expect(page.getByText("Latest Assessment")).toBeVisible();
  });

  test("health page shows assessment dimensions", async ({ page }) => {
    await page.goto("/projects/proj-alpha/health");
    await expect(page.getByText("Business Dimensions")).toBeVisible();
    await expect(page.getByText("Vibe Checks")).toBeVisible();
  });

  test("new assessment button is visible", async ({ page }) => {
    await page.goto("/projects/proj-alpha/health");
    await expect(page.getByRole("link", { name: "New Assessment" })).toBeVisible();
  });
});
