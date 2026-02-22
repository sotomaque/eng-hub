import { expect, test } from "./helpers";

test.describe("Org chart", () => {
  test("org chart page shows title", async ({ page }) => {
    await page.goto("/projects/proj-alpha/org-chart");
    await expect(page.getByText("Organization Chart")).toBeVisible();
  });

  test("org chart shows seeded team members", async ({ page }) => {
    await page.goto("/projects/proj-alpha/org-chart");
    await expect(page.getByText("Alice Smith")).toBeVisible();
    await expect(page.getByText("Bob Jones")).toBeVisible();
    await expect(page.getByText("Carol Lee")).toBeVisible();
    await expect(page.getByText("Diana Park")).toBeVisible();
  });

  test("org chart shows manager hierarchy with reports", async ({ page }) => {
    await page.goto("/projects/proj-alpha/org-chart");
    // Alice manages Bob and Carol — her tree is expanded by default
    await expect(page.getByText("Alice Smith")).toBeVisible();
    await expect(page.getByText("Bob Jones")).toBeVisible();
    await expect(page.getByText("Carol Lee")).toBeVisible();
    // Alice's node shows department and title
    await expect(page.getByText("Engineering Manager")).toBeVisible();
  });
});
