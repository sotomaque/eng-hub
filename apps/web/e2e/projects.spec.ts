import { expect, test } from "./helpers";

test.describe("Projects", () => {
  test("projects list shows seeded projects", async ({ page }) => {
    await page.goto("/projects");
    await expect(
      page.getByRole("link", { name: "Alpha", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Gamma" })).toBeVisible();
  });

  test("Beta is listed as a sub-project of Alpha", async ({ page }) => {
    await page.goto("/projects");
    await expect(
      page.getByRole("link", { name: "Sub-project of Alpha" }),
    ).toBeVisible();
  });

  test("search filters projects", async ({ page }) => {
    await page.goto("/projects");
    await page.getByPlaceholder("Search projects").fill("Gamma");
    await expect(page.getByRole("link", { name: "Gamma" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Alpha", exact: true }),
    ).toBeHidden();
  });

  test("project detail page loads with sidebar navigation", async ({
    page,
  }) => {
    await page.goto("/projects/proj-alpha");

    // Sidebar navigation items (under "Navigation" group)
    await expect(
      page.getByRole("link", { name: "Overview", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Health", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "People", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Roadmap", exact: true }),
    ).toBeVisible();
  });

  test("project overview shows metric cards", async ({ page }) => {
    await page.goto("/projects/proj-alpha");

    // Metric cards use CSS uppercase — match the actual text content
    const main = page.locator("main");
    await expect(main.getByText("Health").first()).toBeVisible();
    await expect(main.getByText("Team").first()).toBeVisible();
    await expect(main.getByText("Milestones").first()).toBeVisible();
    await expect(main.getByText("Quarterly Goals").first()).toBeVisible();
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
