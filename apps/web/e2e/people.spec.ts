import { expect, test } from "./helpers";

test.describe("People directory", () => {
  test("people page shows seeded people", async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByText("Alice Smith")).toBeVisible();
    await expect(page.getByText("Bob Jones")).toBeVisible();
    await expect(page.getByText("Carol Lee")).toBeVisible();
    await expect(page.getByText("Diana Park")).toBeVisible();
    await expect(page.getByText("Evan Chen")).toBeVisible();
  });

  test("people page shows total count", async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByText(/\d+ people/)).toBeVisible();
  });

  test("search filters people", async ({ page }) => {
    await page.goto("/people");
    await page.getByPlaceholder(/search people/i).fill("Alice");
    await expect(page.getByText("Alice Smith")).toBeVisible();
    await expect(page.getByText("Bob Jones")).toBeHidden();
  });

  test("add person button is visible", async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByRole("button", { name: /add person/i })).toBeVisible();
  });

  test("search filter is preserved when opening and closing edit sheet", async ({ page }) => {
    await page.goto("/people");
    await page.getByPlaceholder(/search people/i).fill("Alice");
    await page.waitForURL(/search=Alice/);

    await page.getByRole("button", { name: "Edit" }).first().click();
    await expect(page).toHaveURL(/search=Alice/);
    await expect(page).toHaveURL(/edit=/);

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/search=Alice/);
    await expect(page).not.toHaveURL(/edit=/);
  });
});

test.describe("Person profile editing", () => {
  test("edit button opens sheet on profile page", async ({ page }) => {
    await page.goto("/people/person-bob");
    await expect(page.getByRole("heading", { level: 1, name: "Bob Jones" })).toBeVisible();

    // Click the edit pencil button
    await page.getByRole("button", { name: /edit/i }).click();

    // PersonSheet should open with Bob's data
    await expect(page.getByRole("heading", { name: /edit person/i })).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toHaveValue("Bob");

    // Cancel and verify we stay on the profile page
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/people\/person-bob/);
    await expect(page.getByRole("heading", { level: 1, name: "Bob Jones" })).toBeVisible();
  });
});
