import { expect, test } from "./helpers";

test.describe("Project team", () => {
  test("team page shows seeded members", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    const main = page.locator("main");
    await expect(main.getByText("Alice Smith")).toBeVisible();
    await expect(main.getByText("Bob Jones")).toBeVisible();
    await expect(main.getByText("Carol Lee")).toBeVisible();
    await expect(main.getByText("Diana Park")).toBeVisible();
  });

  test("team page shows add member button", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    await expect(page.getByRole("button", { name: /add member/i })).toBeVisible();
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

test.describe("Roll off team members", () => {
  test("rolled-off member does not appear on team page", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    const main = page.locator("main");
    // Frank was seeded as rolled off — should NOT appear
    await expect(main.getByText("Frank Wu")).toBeHidden();
    // Active members should still be visible
    await expect(main.getByText("Alice Smith")).toBeVisible();
  });

  test("rolled-off member profile shows project with badge", async ({ page }) => {
    await page.goto("/people/person-frank");
    // Frank's profile should show Alpha project with "Rolled Off" badge
    await expect(page.getByRole("link", { name: "Alpha" })).toBeVisible();
    await expect(page.getByText("Rolled Off")).toBeVisible();
    // Project count should show "0 active · 1 previous"
    await expect(page.getByText("0 active · 1 previous")).toBeVisible();
  });

  test("rolled-off member shows badge in stats table", async ({ page }) => {
    await page.goto("/projects/proj-alpha/stats");
    // Wait for the stats table to load (Contributor Rankings card)
    await expect(page.getByText("Contributor Rankings")).toBeVisible();
    // Frank should appear with "Rolled Off" badge
    const frankRow = page.getByRole("row").filter({ hasText: "frankwu" });
    await expect(frankRow).toBeVisible();
    await expect(frankRow.getByText("Rolled Off")).toBeVisible();
  });

  test("roll off a member and verify removal from team page", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    // Diana is on the Design team — find her row and click the delete button
    const dianaRow = page.getByRole("row").filter({ hasText: "Diana Park" });
    await expect(dianaRow).toBeVisible();
    await dianaRow.getByRole("button", { name: /roll off/i }).click();

    // Confirm the roll-off dialog
    await expect(page.getByRole("heading", { name: /roll off team member/i })).toBeVisible();
    await page.getByRole("button", { name: "Roll Off" }).click();

    // Wait for the success toast
    await expect(page.getByText("Team member rolled off")).toBeVisible();

    // Diana should no longer appear on the team page
    await expect(page.locator("main").getByText("Diana Park")).toBeHidden();
  });

  test("rolled-off member can be re-added to the project", async ({ page }) => {
    // Diana was rolled off in the previous test — re-add her
    await page.goto("/projects/proj-alpha/team");
    await expect(page.locator("main").getByText("Diana Park")).toBeHidden();

    await page.getByRole("button", { name: /add member/i }).click();
    // Open the existing people combobox, then search
    await page.getByRole("button", { name: /search existing people/i }).click();
    await page.getByPlaceholder(/search by name/i).fill("Diana");
    await page.getByRole("option", { name: /Diana Park/i }).click();

    // Submit the form
    await page.getByRole("button", { name: "Add Member" }).click();

    // Wait for the sheet to close and verify Diana reappears
    await page.waitForURL("**/team");
    await expect(page.locator("main").getByText("Diana Park")).toBeVisible();
  });
});

test.describe("Manager transfer on roll off", () => {
  test("shows direct reports when rolling off a manager", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    // Alice manages Bob and Carol on this project
    const aliceRow = page.getByRole("row").filter({ hasText: "Alice Smith" });
    await aliceRow.getByRole("button", { name: /roll off/i }).click();

    // Enhanced dialog should appear with warning about direct reports
    await expect(page.getByText(/has 2 direct report/i)).toBeVisible();
    await expect(page.getByText("Bob Jones")).toBeVisible();
    await expect(page.getByText("Carol Lee")).toBeVisible();

    // Cancel without making changes
    await page.getByRole("button", { name: /cancel/i }).click();
    // Alice should still be on the team
    await expect(page.locator("main").getByText("Alice Smith")).toBeVisible();
  });

  test("shows simple dialog for member with no reports", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    // Diana has no direct reports on this project
    const dianaRow = page.getByRole("row").filter({ hasText: "Diana Park" });
    await dianaRow.getByRole("button", { name: /roll off/i }).click();

    // Should show simple confirmation, no mention of direct reports
    await expect(page.getByRole("heading", { name: /roll off team member/i })).toBeVisible();
    await expect(page.getByText(/has \d+ direct report/i)).toBeHidden();

    await page.getByRole("button", { name: /cancel/i }).click();
  });

  test("reassign reports and roll off a manager", async ({ page }) => {
    await page.goto("/projects/proj-alpha/team");
    const aliceRow = page.getByRole("row").filter({ hasText: "Alice Smith" });
    await aliceRow.getByRole("button", { name: /roll off/i }).click();

    // Enhanced dialog should appear
    await expect(page.getByText(/has 2 direct report/i)).toBeVisible();

    // Select Diana Park as the new manager
    await page.getByRole("button", { name: /select new manager/i }).click();
    await page.getByPlaceholder(/search people/i).fill("Diana");
    await page.getByRole("option", { name: /Diana Park/i }).click();

    // Click "Reassign & Roll Off"
    await page.getByRole("button", { name: /reassign.*roll off/i }).click();

    // Wait for success toast
    await expect(page.getByText("Team member rolled off")).toBeVisible();

    // Alice should no longer appear
    await expect(page.locator("main").getByText("Alice Smith")).toBeHidden();
    // Bob and Carol should still be visible (not rolled off)
    await expect(page.locator("main").getByText("Bob Jones")).toBeVisible();
    await expect(page.locator("main").getByText("Carol Lee")).toBeVisible();
  });
});
