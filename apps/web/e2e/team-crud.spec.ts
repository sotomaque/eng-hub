import { expect, test } from "./helpers";

test.describe("Team member CRUD", () => {
  test("add a new team member to the project", async ({ page }) => {
    const firstName = "Zara";
    const lastName = `Test${Date.now()}`;

    await page.goto("/projects/proj-alpha/team?addMember=true");
    await expect(
      page.getByRole("heading", { name: "Add Team Member" }),
    ).toBeVisible();

    // Fill required fields
    await page.locator("#firstName").fill(firstName);
    await page.locator("#lastName").fill(lastName);
    await page
      .locator("#email")
      .fill(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`);

    // Submit
    await page.getByRole("button", { name: "Add Member" }).click();

    // Sheet closes on success
    await expect(
      page.getByRole("heading", { name: "Add Team Member" }),
    ).toBeHidden();

    // New member appears on the team page
    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();
  });
});
