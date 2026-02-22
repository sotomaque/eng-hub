import { expect, test } from "./helpers";

test.describe("Project team", () => {
  test("team page shows seeded members", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    await expect(page.getByText("Alice Smith")).toBeVisible();
    await expect(page.getByText("Bob Jones")).toBeVisible();
    await expect(page.getByText("Carol Lee")).toBeVisible();
    await expect(page.getByText("Diana Park")).toBeVisible();
  });

  test("team page shows add member button", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    await expect(
      page.getByRole("button", { name: /add member/i }),
    ).toBeVisible();
  });

  test("team page shows team groupings", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    await expect(page.getByRole("heading", { name: "Frontend" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Backend" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Design" })).toBeVisible();
  });

  test("team search filters members", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    await page.getByPlaceholder("Search across all teams").fill("Bob");
    await expect(page.getByText("Bob Jones")).toBeVisible();
    await expect(page.getByText("Carol Lee")).toBeHidden();
  });
});
