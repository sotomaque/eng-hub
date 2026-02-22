import { expect, test } from "./helpers";

test.describe("Projects", () => {
  test("projects list shows seeded projects", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: "Alpha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gamma" })).toBeVisible();
  });

  test("Beta is listed as a sub-project of Alpha", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByText("Sub-project of Alpha")).toBeVisible();
  });

  test("search filters projects", async ({ page }) => {
    await page.goto("/projects");
    await page.getByPlaceholder("Search projects").fill("Gamma");
    await expect(page.getByRole("link", { name: "Gamma" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Alpha" })).toBeHidden();
  });

  test("project detail page loads with sidebar navigation", async ({
    page,
  }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Alpha" }).first().click();
    await page.waitForURL(/\/projects\/proj-alpha/);

    // Sidebar navigation items
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Health" })).toBeVisible();
    await expect(page.getByRole("link", { name: "People" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Roadmap" })).toBeVisible();
  });

  test("project overview shows metric cards", async ({ page }) => {
    await page.goto("/projects/proj-alpha");

    await expect(page.getByText("HEALTH")).toBeVisible();
    await expect(page.getByText("TEAM")).toBeVisible();
    await expect(page.getByText("MILESTONES")).toBeVisible();
    await expect(page.getByText("QUARTERLY GOALS")).toBeVisible();
  });

  test("project overview shows sub-projects section", async ({ page }) => {
    await page.goto("/projects/proj-alpha");
    await expect(
      page.getByRole("heading", { name: "Sub-Projects" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Beta" })).toBeVisible();
  });

  test("Beta project shows parent in sidebar", async ({ page }) => {
    await page.goto("/projects/proj-beta");
    await expect(page.getByText("Parent Project")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Alpha" }).first(),
    ).toBeVisible();
  });
});
