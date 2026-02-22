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
    await expect(page.getByText(/5 people/)).toBeVisible();
  });

  test("search filters people", async ({ page }) => {
    await page.goto("/people");
    await page.getByPlaceholder(/search people/i).fill("Alice");
    await expect(page.getByText("Alice Smith")).toBeVisible();
    await expect(page.getByText("Bob Jones")).toBeHidden();
  });

  test("add person button is visible", async ({ page }) => {
    await page.goto("/people");
    await expect(
      page.getByRole("button", { name: /add person/i }),
    ).toBeVisible();
  });
});
