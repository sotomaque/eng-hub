import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

/**
 * Seed recap for /projects/proj-alpha:
 *   - Teams: Frontend, Backend, Design
 *   - Memberships: Bob → Frontend, Carol → Backend, Diana → Design
 *   - Alice is a team member but unassigned to any team
 */

async function gotoActiveArrangement(page: Page) {
  await page.goto("/projects/proj-alpha/arrangements");
  // The first card is the active arrangement (auto-created on first visit).
  await page.getByRole("heading", { name: "Current Teams" }).first().click();
  await page.waitForURL(/\/projects\/proj-alpha\/arrangements\/[^/]+$/);
}

test.describe("Arrangement multi-team assignment", () => {
  test("dialog opens when clicking a member chip", async ({ page }) => {
    await gotoActiveArrangement(page);
    await page
      .getByRole("button", { name: /Bob Jones/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toContainText(/Edit teams for Bob Jones/i);
    // Frontend should be pre-selected.
    const frontendBtn = page.getByRole("dialog").getByRole("button", { name: "Frontend" });
    await expect(frontendBtn).toBeVisible();
    // Cancel leaves state unchanged.
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("assigning a member to a second team keeps them in both", async ({ page }) => {
    await gotoActiveArrangement(page);
    await page
      .getByRole("button", { name: /Bob Jones/i })
      .first()
      .click();

    // Add Design to Bob's teams
    await page.getByRole("dialog").getByRole("button", { name: "Design" }).click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Bob should appear in Frontend AND Design
    // Use precise selectors: each team card has a heading + members list
    await expect(page.getByRole("button", { name: /Bob Jones/i })).toHaveCount(2);
  });

  test("removing a team via the dialog removes the member from just that team", async ({
    page,
  }) => {
    await gotoActiveArrangement(page);

    // First give Bob Design (state from previous test is not guaranteed — start explicit)
    await page
      .getByRole("button", { name: /Bob Jones/i })
      .first()
      .click();
    const designBtn = page.getByRole("dialog").getByRole("button", { name: "Design" });
    // Ensure Design is selected
    const designClass = await designBtn.getAttribute("class");
    if (!designClass?.includes("bg-primary")) {
      await designBtn.click();
    }
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Now unselect Frontend
    await page
      .getByRole("button", { name: /Bob Jones/i })
      .first()
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "Frontend" }).click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Bob should now appear only in Design
    await expect(page.getByRole("button", { name: /Bob Jones/i })).toHaveCount(1);
  });
});

test.describe("Team page reflects multi-team memberships", () => {
  test("member assigned to multiple teams shows up under each", async ({ page }) => {
    // Assign via the arrangement editor first.
    await gotoActiveArrangement(page);
    await page
      .getByRole("button", { name: /Carol Lee/i })
      .first()
      .click();
    await page.getByRole("dialog").getByRole("button", { name: "Frontend" }).click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Navigate to the team page and expect Carol under both Backend and Frontend
    await page.goto("/projects/proj-alpha/team");
    const main = page.locator("main");
    await expect(main.getByText("Carol Lee")).toHaveCount(2);
  });
});
