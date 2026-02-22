import { expect, test } from "./helpers";

test.describe("Team member CRUD", () => {
  test("add a new team member to the project", async ({ page }) => {
    const firstName = "Zara";
    const lastName = `Test${Date.now()}`;

    // Navigate to team page and wait for it to load
    await page.goto("/projects/proj-alpha/team");
    await expect(page.getByRole("button", { name: /Add Member/i })).toBeVisible(
      { timeout: 15_000 },
    );

    // Open the add member sheet
    await page.getByRole("button", { name: /Add Member/i }).click();
    await expect(
      page.getByRole("heading", { name: "Add Team Member" }),
    ).toBeVisible({ timeout: 15_000 });

    // Fill required fields
    await page.locator("#firstName").fill(firstName);
    await page.locator("#lastName").fill(lastName);
    await page
      .locator("#email")
      .fill(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`);

    // Select department (required by server — departmentId is a FK)
    await page.getByRole("button", { name: /No department/ }).click();
    await page.getByRole("option", { name: "Engineering" }).click();

    // Verify department selection took effect (popover closes, button shows selection)
    await expect(
      page.getByRole("button", { name: "Engineering" }),
    ).toBeVisible();

    // Intercept tRPC mutation response for diagnostics on failure
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/trpc/") && r.request().method() === "POST",
    );

    // Submit
    await page.getByRole("button", { name: "Add Member" }).click();

    // Wait for mutation response and assert success
    const response = await responsePromise;
    expect(
      response.ok(),
      `tRPC mutation failed with status ${response.status()}: ${await response.text()}`,
    ).toBe(true);

    // Sheet closes on success
    await expect(
      page.getByRole("heading", { name: "Add Team Member" }),
    ).toBeHidden({ timeout: 15_000 });

    // New member appears on the team page
    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();
  });
});
