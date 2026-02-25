import { expect, test } from "./helpers";

test.describe("Project links", () => {
  test("links page shows seeded links", async ({ page }) => {
    await page.goto("/projects/proj-alpha/links");
    await expect(page.getByText("Documentation")).toBeVisible();
    await expect(page.getByText("Figma Designs")).toBeVisible();
  });

  test("links page shows Links title", async ({ page }) => {
    await page.goto("/projects/proj-alpha/links");
    // CardTitle renders as a div, not a heading
    await expect(page.locator("[data-slot='card-title']").first()).toBeVisible();
  });

  test("add link button is visible", async ({ page }) => {
    await page.goto("/projects/proj-alpha/links");
    await expect(page.getByRole("button", { name: /add link/i })).toBeVisible();
  });

  test("empty project shows no links message", async ({ page }) => {
    await page.goto("/projects/proj-gamma/links");
    await expect(page.getByText(/no links yet/i)).toBeVisible();
  });
});
