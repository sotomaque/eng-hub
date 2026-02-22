import { expect, test } from "./helpers";

test.describe("Roadmap", () => {
  test("roadmap page shows milestones section", async ({ page }) => {
    await page.goto("/projects/proj-alpha/roadmap");
    // Allow extra time for Suspense + cold-start SSR in CI
    await expect(page.getByRole("heading", { name: "Milestones" })).toBeVisible(
      { timeout: 15_000 },
    );
  });

  test("roadmap page shows seeded milestones", async ({ page }) => {
    await page.goto("/projects/proj-alpha/roadmap");
    await expect(page.getByText("MVP Launch")).toBeVisible();
    await expect(page.getByText("Beta Release")).toBeVisible();
  });

  test("roadmap page shows quarterly goals", async ({ page }) => {
    await page.goto("/projects/proj-alpha/roadmap");
    await expect(
      page.getByRole("heading", { name: "Quarterly Goals" }),
    ).toBeVisible();
    await expect(page.getByText("Improve Performance")).toBeVisible();
    await expect(page.getByText("Test Coverage 80%")).toBeVisible();
  });
});
