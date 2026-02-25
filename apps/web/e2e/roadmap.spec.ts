import { expect, test } from "./helpers";

test.describe("Roadmap", () => {
  test("roadmap page shows milestones section", async ({ page }) => {
    await page.goto("/projects/proj-alpha/roadmap");
    // Allow extra time for Suspense + cold-start SSR in CI
    await expect(page.getByRole("heading", { name: "Milestones" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("roadmap page shows seeded milestones", async ({ page }) => {
    await page.goto("/projects/proj-alpha/roadmap");
    await expect(page.getByText("MVP Launch")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Beta Release")).toBeVisible();
  });

  test("roadmap page shows quarterly goals", async ({ page }) => {
    await page.goto("/projects/proj-alpha/roadmap");
    await expect(page.getByRole("heading", { name: "Quarterly Goals" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Improve Performance")).toBeVisible();
    await expect(page.getByText("Test Coverage 80%")).toBeVisible();
  });

  test("clicking a milestone navigates to its detail page", async ({ page }) => {
    await page.goto("/projects/proj-alpha/roadmap");
    await expect(page.getByText("MVP Launch")).toBeVisible({ timeout: 15_000 });

    await page.getByText("MVP Launch").click();
    await page.waitForURL(/\/projects\/proj-alpha\/roadmap\/ms-mvp/);

    await expect(page.getByRole("heading", { name: "MVP Launch" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Key Results" })).toBeVisible();
    await expect(page.getByText("API response time < 200ms")).toBeVisible();
  });

  test("clicking a quarterly goal navigates to its detail page", async ({ page }) => {
    await page.goto("/projects/proj-alpha/roadmap");
    await expect(page.getByText("Test Coverage 80%")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Test Coverage 80%").click();
    await page.waitForURL(/\/projects\/proj-alpha\/roadmap\/qg-tests/);

    await expect(page.getByRole("heading", { name: "Test Coverage 80%" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Key Results" })).toBeVisible();
    await expect(page.getByText("Unit test coverage")).toBeVisible();
  });
});
