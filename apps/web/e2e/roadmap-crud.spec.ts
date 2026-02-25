import { expect, test } from "./helpers";

test.describe("Roadmap CRUD", () => {
  test("create a new milestone", async ({ page }) => {
    const title = `E2E Milestone ${Date.now()}`;

    // Navigate directly to the add-milestone URL (sheet opens server-side via searchParam)
    await page.goto("/projects/proj-alpha/roadmap?addMilestone=true");
    await expect(page.getByRole("heading", { name: "Add Milestone" })).toBeVisible({
      timeout: 15_000,
    });

    // Fill the title (status defaults to "Not Started")
    await page.locator("#title").fill(title);

    // Submit
    await page.getByRole("button", { name: "Add Milestone" }).click();

    // Sheet closes after server re-render removes ?addMilestone param
    await expect(page.getByRole("heading", { name: "Add Milestone" })).toBeHidden({
      timeout: 15_000,
    });

    // Reload to bypass stale cache (after() invalidation races with router.refresh())
    await page.reload();

    // New milestone appears on the roadmap
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });
});
