import { expect, test } from "./helpers";

test.describe("Person departure — visibility", () => {
  test("departed people are hidden from the default list", async ({ page }) => {
    await page.goto("/people");
    // Gina was seeded with left_at set — should NOT appear by default.
    await expect(page.getByText("Gina Rolloff")).toBeHidden();
    // Active members still visible.
    await expect(page.getByText("Alice Smith")).toBeVisible();
  });

  test("toggling Show departed reveals departed people with a badge", async ({ page }) => {
    await page.goto("/people");
    await page.getByRole("button", { name: /show departed/i }).click();
    await page.waitForURL(/showDeparted=true/);
    const ginaRow = page.getByRole("row").filter({ hasText: "Gina Rolloff" });
    await expect(ginaRow).toBeVisible();
    await expect(ginaRow.getByText(/Departed/)).toBeVisible();
  });

  test("searching with Show departed on returns the departed person", async ({ page }) => {
    await page.goto("/people?showDeparted=true");
    await page.getByPlaceholder(/search people/i).fill("Gina");
    await expect(page.getByText("Gina Rolloff")).toBeVisible();
  });
});

test.describe("Person departure — profile", () => {
  test("profile page shows Not active badge for departed person", async ({ page }) => {
    await page.goto("/people/person-gina");
    await expect(page.getByRole("heading", { level: 1, name: "Gina Rolloff" })).toBeVisible();
    await expect(page.getByText(/Not active/)).toBeVisible();
    // Edit pencil should be hidden for departed people.
    await expect(page.getByRole("button", { name: /^edit$/i })).toBeHidden();
  });
});

test.describe("Mark as departed dialog", () => {
  test("dialog opens from the people list", async ({ page }) => {
    await page.goto("/people");
    // Find the row for Diana (no direct reports, not a project owner) and click the action.
    const dianaRow = page.getByRole("row").filter({ hasText: "Diana Park" });
    await dianaRow.getByRole("button", { name: /mark as departed/i }).click();
    await expect(page.getByRole("dialog")).toContainText(/Mark Diana Park as departed/i);
    await expect(page.getByRole("button", { name: /mark as departed/i }).last()).toBeVisible();
    // Cancel and confirm no state change.
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Diana Park")).toBeVisible();
  });

  test("manager with direct reports sees reassignment UI", async ({ page }) => {
    await page.goto("/people");
    // Alice manages Bob, Carol, Frank — should block until reassigned.
    const aliceRow = page.getByRole("row").filter({ hasText: "Alice Smith" });
    await aliceRow.getByRole("button", { name: /mark as departed/i }).click();
    await expect(page.getByText(/direct report/i)).toBeVisible();
    await expect(page.getByText(/Reassign all reports to/i)).toBeVisible();
    // Submit button is disabled until a manager is selected.
    const submit = page.getByRole("dialog").getByRole("button", { name: /mark as departed/i });
    await expect(submit).toBeDisabled();
  });

  test("owner warning is shown for project owners", async ({ page }) => {
    await page.goto("/people");
    // Evan owns project Gamma.
    const evanRow = page.getByRole("row").filter({ hasText: "Evan Chen" });
    await evanRow.getByRole("button", { name: /mark as departed/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/Owns \d+ project/i)).toBeVisible();
    await expect(dialog.getByText(/Gamma/)).toBeVisible();
    // Warning is non-blocking — submit remains enabled.
    await expect(dialog.getByRole("button", { name: /mark as departed/i })).toBeEnabled();
  });
});
