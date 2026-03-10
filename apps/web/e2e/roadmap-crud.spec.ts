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

  test("create another milestone (form resets and second submit works)", async ({ page }) => {
    const title1 = `E2E MS1 ${Date.now()}`;
    const title2 = `E2E MS2 ${Date.now()}`;

    await page.goto("/projects/proj-alpha/roadmap?addMilestone=true");
    await expect(page.getByRole("heading", { name: "Add Milestone" })).toBeVisible({
      timeout: 15_000,
    });

    // Check "Create another" before first submit
    await page.getByLabel("Create another").check();

    // Fill and submit the first milestone
    await page.locator("#title").fill(title1);
    await page.getByRole("button", { name: "Add Milestone" }).click();

    // Sheet stays open — title clears, heading remains
    await expect(page.getByRole("heading", { name: "Add Milestone" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#title")).toHaveValue("", { timeout: 5_000 });

    // Fill and submit a second milestone (this is the step that failed before the fix)
    await page.locator("#title").fill(title2);
    await page.getByRole("button", { name: "Add Milestone" }).click();

    // Sheet still open (create another still checked)
    await expect(page.getByRole("heading", { name: "Add Milestone" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#title")).toHaveValue("", { timeout: 5_000 });

    // Close the sheet and verify both milestones exist
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.reload();
    await expect(page.getByText(title1)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(title2)).toBeVisible();
  });

  test("create another quarterly goal (form resets and second submit works)", async ({ page }) => {
    const title1 = `E2E QG1 ${Date.now()}`;
    const title2 = `E2E QG2 ${Date.now()}`;

    await page.goto("/projects/proj-alpha/roadmap?addGoal=true");
    await expect(page.getByRole("heading", { name: "Add Quarterly Goal" })).toBeVisible({
      timeout: 15_000,
    });

    // Check "Create another" before first submit
    await page.getByLabel("Create another").check();

    // Fill and submit the first goal
    await page.locator("#title").fill(title1);
    await page.getByRole("button", { name: "Add Goal" }).click();

    // Sheet stays open — title clears, heading remains
    await expect(page.getByRole("heading", { name: "Add Quarterly Goal" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#title")).toHaveValue("", { timeout: 5_000 });

    // Fill and submit a second goal
    await page.locator("#title").fill(title2);
    await page.getByRole("button", { name: "Add Goal" }).click();

    // Sheet still open
    await expect(page.getByRole("heading", { name: "Add Quarterly Goal" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#title")).toHaveValue("", { timeout: 5_000 });

    // Close and verify both goals exist
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.reload();
    await expect(page.getByText(title1)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(title2)).toBeVisible();
  });
});
