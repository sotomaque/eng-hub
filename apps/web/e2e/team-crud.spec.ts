import { expect, test } from "./helpers";

test.describe("Team member CRUD", () => {
  test("add a new team member to the project", async ({ page }) => {
    const firstName = "Zara";
    const lastName = `Test${Date.now()}`;

    await page.goto("/projects/proj-alpha/team?addMember=true");
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

    // Submit
    await page.getByRole("button", { name: "Add Member" }).click();

    // Sheet closes on success
    await expect(
      page.getByRole("heading", { name: "Add Team Member" }),
    ).toBeHidden({ timeout: 15_000 });

    // New member appears on the team page
    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();
  });
});
