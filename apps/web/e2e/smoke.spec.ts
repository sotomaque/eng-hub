import { expect, test } from "./helpers";

test.describe("Smoke tests", () => {
  test("homepage loads and shows hero content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /organized/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Started" })).toBeVisible();
  });

  test("homepage navigation links are visible", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Projects" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "People" })).toBeVisible();
  });

  test("navigating to projects page shows project list", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });

  test("navigating to people page loads", async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByRole("heading", { name: /people/i })).toBeVisible();
  });
});
