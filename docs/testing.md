# Testing Guide

How eng-hub tests its code — and how your team can adopt the same approach.

---

## Architecture at a Glance

```
PR opened
  │
  ├─ Lint (Biome)
  ├─ Type Check (tsc --noEmit)
  ├─ Unit Tests (bun test)           ← mocked, fast, deterministic
  │
  └─ E2E Tests (Playwright)          ← real browser, real auth, real data
       │
       ├─ Wait for Vercel preview deployment
       ├─ Reset + seed preview database
       ├─ Run Playwright against live preview
       └─ Upload HTML report + screenshots as artifacts
```

Every PR gets the full pipeline. E2E tests run against an actual Vercel preview deployment with a freshly seeded database — not a local dev server, not mocked data, not a Docker container.

---

## Unit Tests

### What and Why

Unit tests cover business logic that is fast to verify, deterministic, and doesn't need a browser. We test:

- **Business logic with correctness risk** — hierarchy access control, cycle detection, arrangement sync, GitHub stats aggregation
- **Validation schemas** — every Zod schema that guards user input
- **Pure utilities** — tier assignment, color mapping, icon matching, URL parsing
- **tRPC procedures with non-trivial logic** — pagination, filters, manager cycle detection, favorites, entity merging

We do **not** unit test framework wiring, Prisma queries, or component rendering. If the E2E test loads the page and the data shows up, those layers work.

### Runner and Location

| Runner | Location |
|--------|----------|
| `bun:test` | `apps/web/__tests__/` — validation schemas, utilities |
| `bun:test` | `packages/api/src/routers/__tests__/` — tRPC procedure logic |
| `bun:test` | `packages/api/src/lib/__tests__/` — pure business logic |

### Running

```bash
cd apps/web
bun run test          # all unit tests
bun run test:watch    # watch mode
```

### How We Mock

All mocks are declared **before** the import of the module under test. We use `bun:test`'s `mock.module()` to replace `@workspace/db`, `@clerk/nextjs/server`, and any other dependency with controlled fakes.

```typescript
import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks (before any imports of the module under test) ──

const mockPersonFindMany = mock(() => Promise.resolve([]));
const mockPersonCount = mock(() => Promise.resolve(0));

mock.module("@workspace/db", () => ({
  db: {
    person: {
      findMany: mockPersonFindMany,
      count: mockPersonCount,
    },
  },
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── Import router + create caller ──

const { personRouter } = await import("../person");
const { createCallerFactory } = await import("../../trpc");
const createCaller = createCallerFactory(personRouter);
const caller = createCaller({ userId: "test-user-id" });

// ── Tests ──

describe("person.list", () => {
  beforeEach(() => {
    mockPersonFindMany.mockReset().mockResolvedValue([]);
    mockPersonCount.mockReset().mockResolvedValue(0);
  });

  test("returns paginated results with totalCount", async () => {
    mockPersonFindMany.mockResolvedValue([
      { id: "p-1", firstName: "Alice", lastName: "Smith" },
    ]);
    mockPersonCount.mockResolvedValue(1);

    const result = await caller.list({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.totalCount).toBe(1);

    // Verify Prisma received the right query
    const callArgs = mockPersonFindMany.mock.calls[0]?.[0];
    expect(callArgs.skip).toBe(0);
    expect(callArgs.take).toBe(10);
  });
});
```

Key conventions:
- `mock.module()` at the top, then dynamic `import()` of the module under test
- `beforeEach` resets all mocks to prevent leakage between tests
- Inspect `mock.calls[0]?.[0]` to verify the arguments passed to Prisma
- `createCallerFactory` lets us call tRPC procedures directly without HTTP

### Coverage: 169 Tests Across 35+ Files

| Category | Tests | Examples |
|----------|-------|---------|
| Business logic | ~52 | Hierarchy chains (13), cycle detection (10), arrangement sync (7), GitHub stats (14), meeting access (8) |
| Validation schemas | ~113 | Person, project, team, milestone, health, goals, key results, arrangements, links |
| Utilities | ~25 | Tier assignment, title colors, link icons, cache keys |
| tRPC procedures | ~77 | Person list/update, project list/update/favorites, arrangements, billets, meetings, department merge, GitHub sync |

---

## E2E Tests

### What and Why

E2E tests cover the critical user journeys that touch every layer of the stack: browser rendering, client-side state, tRPC calls, server-side logic, database queries, and authentication. If an E2E test passes, the feature works.

### The Pipeline

This is the sequence that runs on every PR:

#### 1. Wait for Vercel Preview

```yaml
- name: Wait for Vercel preview deployment
  uses: patrickedqvist/wait-for-vercel-preview@v1.3.2
  id: vercel
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    max_timeout: 600
    path: /api/health
```

The job waits up to 10 minutes for Vercel to build and deploy the preview. It health-checks `/api/health` to confirm the deployment is live.

#### 2. Reset and Seed the Database

```yaml
- name: Reset preview database
  run: |
    response=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST \
      "${{ steps.vercel.outputs.url }}/api/e2e/reset" \
      -H "x-e2e-reset-token: ${{ secrets.E2E_RESET_SECRET }}")
    http_code=$(echo "$response" | tail -1)
    if [ "$http_code" != "200" ]; then
      echo "::error::Database reset failed with HTTP $http_code"
      exit 1
    fi
```

This hits an API endpoint on the preview deployment itself that truncates the database and repopulates it with deterministic seed data. The endpoint is:

- **Guard 1**: Only available when `VERCEL_ENV === "preview"` (returns 404 in production)
- **Guard 2**: Requires a shared secret via `x-e2e-reset-token` header (returns 401 without it)

Every test run starts from the exact same database state. No flaky tests from leftover data.

#### 3. Run Playwright

```yaml
- name: Run E2E tests
  run: bun run test:e2e
  working-directory: apps/web
  env:
    PLAYWRIGHT_TEST_BASE_URL: ${{ steps.vercel.outputs.url }}
    CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
    E2E_CLERK_USER_USERNAME: ${{ secrets.E2E_CLERK_USER_USERNAME }}
    E2E_CLERK_USER_PASSWORD: ${{ secrets.E2E_CLERK_USER_PASSWORD }}
    E2E_CLERK_USER_ID: ${{ secrets.E2E_CLERK_USER_ID }}
```

Tests run against the live Vercel preview URL with real Clerk authentication. A dedicated E2E test user signs in via Clerk's testing SDK, and the auth state is saved and reused across all specs.

#### 4. Upload Report and Screenshots

```yaml
- name: Upload test results
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: apps/web/playwright-report/
    retention-days: 7
```

The HTML report and failure screenshots are uploaded as GitHub Actions artifacts on every run — even when tests pass. 7-day retention. When a test fails, you get a screenshot of exactly what the browser showed.

### Playwright Configuration

```typescript
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,       // Fail CI if .only() is committed
  retries: process.env.CI ? 2 : 0,    // Retry flaky tests in CI
  workers: process.env.CI ? 1 : undefined, // Sequential in CI for DB consistency
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",           // Full trace on first retry
    screenshot: "only-on-failure",     // Screenshot when something breaks
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.clerk/user.json", // Reuse auth
      },
      dependencies: ["setup"],
    },
  ],
});
```

Key settings:
- **1 worker in CI** — tests run sequentially to avoid database race conditions
- **2 retries in CI** — catches transient network issues against the preview deployment
- **Traces on first retry** — full browser trace for debugging flaky failures
- **Screenshots on failure** — uploaded as artifacts for every failed assertion

### Authentication

The global setup file signs in via Clerk and saves the session:

```typescript
import { clerk, clerkSetup } from "@clerk/testing/playwright";

setup("authenticate", async ({ page }) => {
  await clerkSetup();
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: process.env.E2E_CLERK_USER_USERNAME ?? "",
      password: process.env.E2E_CLERK_USER_PASSWORD ?? "",
    },
  });
  await page.goto("/projects");
  await page.waitForURL(/\/projects/);
  await page.context().storageState({ path: authFile });
});
```

This runs once. All subsequent specs reuse the saved `storageState`, so every test starts already authenticated.

### Seed Data

The `resetAndSeed()` function creates a complete, deterministic dataset:

| Entity | Records | Details |
|--------|---------|---------|
| Departments | 3 | Engineering, Design, Product |
| Titles | 5 | SWE, Sr SWE, EM, Designer, PM |
| People | 6 | Alice (EM), Bob (Sr SWE), Carol (SWE), Diana (Designer), Evan (PM), Frank (SWE) |
| Manager relationships | 3 | Alice manages Bob, Carol, Frank |
| Projects | 3 | Alpha (ACTIVE), Beta (PAUSED, sub-project of Alpha), Gamma (ARCHIVED) |
| Teams | 3 | Frontend, Backend, Design (all on Alpha) |
| Team members | 7 | Includes rolled-off members with `left_at` timestamps |
| Health assessments | 2 | GREEN and YELLOW for Alpha |
| Milestones | 2 | MVP Launch (IN_PROGRESS), Beta Release (NOT_STARTED) |
| Quarterly goals | 2 | With key results tracking progress |
| Project links | 2 | Documentation, Figma Designs |
| GitHub stats | 10 | All-time + YTD for 5 contributors |
| Meetings | 2 | With Tiptap JSON content |
| Meeting templates | 2 | Weekly 1:1, Monthly 1:1 |
| Person goals | 4 | For Bob and Alice across Q1/Q2 |
| Accomplishments | 3 | Shipped API v2, reduced latency, led planning |

Optionally, `E2E_CLERK_USER_ID` links the test user to `person-alice` so tests for personal features (goals, accomplishments) work against a real Clerk identity.

### Test Patterns

**Read flows** — navigate, assert content is visible:

```typescript
test("projects list shows seeded projects", async ({ page }) => {
  await page.goto("/projects");
  await page.getByPlaceholder("Search projects").fill("Alpha");
  await expect(page.getByRole("link", { name: "Alpha", exact: true })).toBeVisible();
});
```

**Write flows** — create/edit entities, verify persistence:

```typescript
test("create a new project", async ({ page }) => {
  const name = `E2E Project ${Date.now()}`;   // Timestamp for uniqueness
  await page.goto("/projects?create=true");
  await page.locator("#name").fill(name);
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page.getByRole("heading", { name: "New Project" })).toBeHidden();
  await expect(page.getByRole("link", { name })).toBeVisible();
});
```

**State reversion** — CRUD tests that modify seeded data revert changes so other tests aren't affected:

```typescript
test("edit status from Active to Archived and back", async ({ page }) => {
  // Change to Archived
  await page.goto("/projects?edit=proj-alpha");
  await page.getByRole("combobox", { name: "Project status" }).click();
  await page.getByRole("option", { name: "Archived" }).click();
  await page.getByRole("button", { name: "Save Changes" }).click();

  // Verify
  const row = page.getByRole("row").filter({ hasText: "Alpha" });
  await expect(row.getByText("Archived")).toBeVisible();

  // Revert for other tests
  await page.goto("/projects?edit=proj-alpha");
  await page.getByRole("combobox", { name: "Project status" }).click();
  await page.getByRole("option", { name: "Active" }).click();
  await page.getByRole("button", { name: "Save Changes" }).click();
});
```

**Selectors** — accessibility-first, always:

```typescript
page.getByRole("link", { name: "Alpha" })           // Links
page.getByRole("button", { name: "Create Project" }) // Buttons
page.getByRole("heading", { name: "Edit Project" })  // Headings
page.getByRole("combobox", { name: "Project status" }) // Selects
page.getByPlaceholder("Search projects")              // Inputs
```

### E2E Coverage: 14 Spec Files

| Priority | Specs | What They Cover |
|----------|-------|-----------------|
| P0 Critical | `smoke.spec.ts`, `projects.spec.ts`, `team.spec.ts` | App loads, auth works, core pages render |
| P1 Features | `health.spec.ts`, `roadmap.spec.ts`, `people.spec.ts`, `links.spec.ts`, `org-chart.spec.ts` | Every major feature's read flow |
| P2 CRUD | `project-crud.spec.ts`, `roadmap-crud.spec.ts`, `health-crud.spec.ts`, `goals.spec.ts`, `project-billets.spec.ts`, `project-owners.spec.ts` | Create, edit, status changes |

### Running Locally

```bash
cd apps/web

# Against local dev server (starts automatically)
bun run test:e2e

# With browser visible
bun run test:e2e:headed

# Interactive UI mode
bun run test:e2e:ui

# Debug mode (step through)
bun run test:e2e:debug
```

For local runs, set `E2E_CLERK_USER_USERNAME`, `E2E_CLERK_USER_PASSWORD`, and optionally `E2E_CLERK_USER_ID` in your `.env`.

---

## CI/CD Workflow

The full workflow in `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:         # Biome linting
  typecheck:    # tsc --noEmit
  test:         # bun run test (unit tests)
  e2e:          # Playwright against Vercel preview
    if: github.event_name == 'pull_request'
    needs: [lint, typecheck, test]
    concurrency:
      group: e2e-${{ github.head_ref }}
      cancel-in-progress: true
```

Key design decisions:
- **E2E only on PRs** — pushes to main skip E2E (the PR already passed). Lint, typecheck, and unit tests run on both.
- **E2E depends on lint + typecheck + unit** — don't waste Vercel build minutes on code that doesn't compile
- **Concurrency group per branch** — if you push again to the same PR, the previous E2E run is cancelled
- **cancel-in-progress** — no queueing of stale runs

---

## Secrets Required

| Secret | Used By | Purpose |
|--------|---------|---------|
| `CLERK_SECRET_KEY` | E2E tests | Server-side Clerk auth |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | E2E tests | Client-side Clerk auth |
| `E2E_CLERK_USER_USERNAME` | Global setup | Test user email |
| `E2E_CLERK_USER_PASSWORD` | Global setup | Test user password |
| `E2E_CLERK_USER_ID` | Seed script | Links test user to person-alice |
| `E2E_RESET_SECRET` | Database reset | Shared token for `/api/e2e/reset` |

---

## Adding a New Test

### New Unit Test

1. Create `packages/api/src/routers/__tests__/your-feature.test.ts`
2. Mock dependencies with `mock.module()` before importing the module under test
3. Use `createCallerFactory` to call tRPC procedures directly
4. Reset mocks in `beforeEach`

### New E2E Test

1. Create `apps/web/e2e/your-feature.spec.ts`
2. If your test needs data, add it to `packages/db/src/seed.ts` with deterministic IDs
3. Use accessibility selectors (`getByRole`, `getByPlaceholder`)
4. If you mutate seeded data, revert it at the end of the test
5. Run locally with `bun run test:e2e:headed` to verify

### New Seed Data

1. Add to `resetAndSeed()` in `packages/db/src/seed.ts`
2. Use deterministic IDs (e.g., `person-alice`, `proj-alpha`)
3. Use `ON CONFLICT (id) DO NOTHING` for idempotency
4. The seed runs via `POST /api/e2e/reset` which is only available on preview deployments

---

## Design Principles

1. **Test against real infrastructure.** E2E tests hit a real Vercel deployment, real Supabase database, and real Clerk auth. No mocked APIs, no Docker containers, no local databases. If it works in the test, it works in production.

2. **Fresh database every run.** The database is truncated and re-seeded before each E2E run. No test depends on the output of another test. No flaky failures from leftover data.

3. **Screenshots and traces on failure.** When a test fails, you get a screenshot of what the browser showed and a full trace on retry. These are uploaded as GitHub Actions artifacts for 7 days.

4. **Accessibility selectors only.** E2E tests use `getByRole`, `getByPlaceholder`, and semantic selectors. No CSS class selectors, no `data-testid` attributes. If the test can find the element, a screen reader can too.

5. **Unit tests mock aggressively.** Unit tests never touch a database. They mock `@workspace/db` and test the logic around it. This keeps them fast (~76ms for 169 tests) and deterministic.

6. **Don't test the framework.** No tests for "does Next.js route to this page" or "does Prisma generate the right SQL." The E2E tests implicitly verify the full stack. Unit tests focus on the logic we wrote.
