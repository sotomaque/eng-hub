import { expect, test } from "./helpers";

test.describe("Roadmap CRUD", () => {
  test("create a new milestone", async ({ page }) => {
    const title = `E2E Milestone ${Date.now()}`;

    await page.goto("/projects/proj-alpha/roadmap?addMilestone=true");
    await expect(
      page.getByRole("heading", { name: "Add Milestone" }),
    ).toBeVisible();

    // Fill the title (status defaults to "Not Started")
    await page.locator("#title").fill(title);

    // Submit
    await page.getByRole("button", { name: "Add Milestone" }).click();

    // Sheet closes on success
    await expect(
      page.getByRole("heading", { name: "Add Milestone" }),
    ).toBeHidden();

    // New milestone appears on the roadmap
    await expect(page.getByText(title)).toBeVisible();
  });
});
