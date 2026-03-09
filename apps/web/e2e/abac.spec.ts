/**
 * ABAC E2E tests — runs as "restricted" project (Bob Jones / Project Member).
 *
 * Bob has:
 *   - Profile: "Project Member" (no project:read, no health, no budget, no write/delete)
 *   - Capabilities: project:team:read, project:roadmap:read, project:links:read,
 *                   project:stats:read, project:arrangements:read, person:read
 *   - Active team membership: proj-alpha only
 *
 * These tests verify that ABAC gating works end-to-end from server queries
 * through client UI rendering.
 */
import { expect, test } from "./helpers";

const HAS_RESTRICTED_USER = !!(
  process.env.E2E_CLERK_USER_USERNAME_2 && process.env.E2E_CLERK_USER_PASSWORD_2
);

test.describe("ABAC — restricted user (Project Member)", () => {
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires destructured first arg
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(!HAS_RESTRICTED_USER, "Requires E2E_CLERK_USER_USERNAME_2 / PASSWORD_2");
  });

  // ── Projects list scoping ─────────────────────────────────────

  test("only sees projects they are a member of", async ({ page }) => {
    await page.goto("/projects");
    // Bob is an active member of Alpha only
    await expect(page.getByRole("link", { name: "Alpha", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    // Should NOT see other seeded projects
    await expect(page.getByRole("link", { name: "Gamma" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Beta" })).toBeHidden();
  });

  // ── Health column / filter hidden ─────────────────────────────

  test("health column is not shown on projects list", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: "Alpha", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    // The "Status" column header (Health) should not exist
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeHidden();
  });

  test("health filter is not shown on projects list", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: "Alpha", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Health" })).toBeHidden();
  });

  // ── Write / Delete actions hidden ─────────────────────────────

  test("no New Project button on projects list", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: "Alpha", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /New Project/ })).toBeHidden();
  });

  test("no Edit or Delete buttons on project rows", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: "Alpha", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Edit" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Delete" })).toBeHidden();
  });

  test("URL manipulation to create project does not open sheet", async ({ page }) => {
    await page.goto("/projects?create=true");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible({ timeout: 15_000 });
    // Sheet should NOT appear
    await expect(page.getByRole("heading", { name: "New Project" })).toBeHidden();
  });

  test("URL manipulation to edit project does not open sheet", async ({ page }) => {
    await page.goto("/projects?edit=proj-alpha");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Edit Project" })).toBeHidden();
  });

  // ── Project overview gating ────────────────────────────────────

  test("project overview hides Health card", async ({ page }) => {
    await page.goto("/projects/proj-alpha");
    const main = page.locator("main");
    // Team and Roadmap should be visible (Bob has those capabilities)
    await expect(main.getByText("Team").first()).toBeVisible({ timeout: 15_000 });
    await expect(main.getByText("Milestones").first()).toBeVisible();
    // Health should NOT be visible
    await expect(main.getByText("Health").first()).toBeHidden();
  });

  test("project overview hides Budget", async ({ page }) => {
    await page.goto("/projects/proj-alpha");
    await expect(page.locator("main").getByText("Team").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Budget")).toBeHidden();
  });

  // ── Project sidebar gating ─────────────────────────────────────

  test("project sidebar hides Health nav link", async ({ page }) => {
    await page.goto("/projects/proj-alpha");
    await expect(page.getByRole("link", { name: "Overview", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    // Should have People and Roadmap
    await expect(page.getByRole("link", { name: "People", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Roadmap", exact: true })).toBeVisible();
    // Should NOT have Health
    await expect(page.getByRole("link", { name: "Health", exact: true })).toBeHidden();
  });

  // ── Admin nav hidden ───────────────────────────────────────────

  test("admin link is not visible in main navigation", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: "Alpha", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: "Admin" })).toBeHidden();
  });

  // ── Direct URL to admin redirects ──────────────────────────────

  test("navigating to /admin redirects away", async ({ page }) => {
    await page.goto("/admin");
    // Admin layout redirects non-admins — wait for any non-admin URL
    await page.waitForURL((url) => !url.pathname.startsWith("/admin"), { timeout: 15_000 });
    expect(page.url()).not.toContain("/admin");
  });
});
