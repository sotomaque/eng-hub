import { expect, test } from "./helpers";

test.describe("Org chart", () => {
  test("org chart page shows title", async ({ page }) => {
    await page.goto("/projects/proj-alpha/org-chart");
    await expect(page.getByText("Organization Chart")).toBeVisible();
  });

  test("org chart shows seeded team members", async ({ page }) => {
    await page.goto("/projects/proj-alpha/org-chart");
    const main = page.locator("main");
    await expect(main.getByText("Alice Smith")).toBeVisible();
    await expect(main.getByText("Bob Jones")).toBeVisible();
    await expect(main.getByText("Carol Lee")).toBeVisible();
    await expect(main.getByText("Diana Park")).toBeVisible();
  });

  test("org chart shows manager hierarchy with reports", async ({ page }) => {
    await page.goto("/projects/proj-alpha/org-chart");
    const main = page.locator("main");
    // Alice manages Bob and Carol — her tree is expanded by default
    await expect(main.getByText("Alice Smith")).toBeVisible();
    await expect(main.getByText("Bob Jones")).toBeVisible();
    await expect(main.getByText("Carol Lee")).toBeVisible();
    // Alice's node shows department and title
    await expect(main.getByText("Engineering Manager")).toBeVisible();
  });
});
