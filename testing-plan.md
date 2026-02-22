# Testing Plan

Strategy for unit tests and E2E tests in eng-hub. The goal is to maximize confidence with minimal test maintenance burden.

## Philosophy

- **Unit tests** cover business logic, data transformations, and validation — things that are fast to test, deterministic, and don't need a browser.
- **E2E tests** cover critical user journeys end-to-end — things that require a real browser, real auth, and real data flowing through the stack.
- **Don't test the framework** — skip testing tRPC wiring, Next.js routing, or Prisma queries in isolation. If the page loads and the data shows up, those layers work.

## Test Runners

| Type | Runner | Location | Runs Against |
|------|--------|----------|-------------|
| Unit | Bun test | `apps/web/__tests__/`, `packages/api/src/**/__tests__/` | Mocked dependencies |
| E2E | Playwright | `apps/web/e2e/` | Vercel preview + Supabase preview branch (seeded) |

---

## Unit Tests — Priority Order

### P0: Business Logic with Correctness Risk

These functions have branching logic where bugs cause real damage (wrong access, data corruption, broken hierarchies).

| # | What to Test | Location | Status |
|---|---|---|---|
| 1 | **Management chain access control** — `isInManagementChain`, `canViewMeetings`, `getManagementChain` | `packages/api/src/lib/hierarchy.ts` | **Covered** (13 tests) — original 7 + 6 canViewMeetings edge cases |
| 2 | **Cycle detection** — `detectProjectCycle`, `detectMilestoneCycle`, `detectGoalCycle` | `packages/api/src/lib/roadmap-hierarchy.ts` | **Covered** (10 tests) — self-ref, direct cycle, deep cycle, max depth, valid tree |
| 3 | **Arrangement sync** — `syncLiveToActiveArrangement` | `packages/api/src/lib/sync-arrangement.ts` | **Covered** (7 tests) — noop, delete/recreate, member mapping, empty project |
| 4 | **GitHub stats aggregation** — `aggregateStats`, trend calculation | `packages/api/src/lib/github.ts` | **Covered** (14 tests) — parseGitHubUrl + aggregateStats + trend edge cases |
| 5 | **Meeting access enforcement** — `meeting.create` only for direct reports, `meeting.getByPersonId` chain check | `packages/api/src/routers/meeting.ts` | **Covered** (8 tests) — create/view access, visibility grants, FORBIDDEN cases |

### P1: Validation Schemas

Zod schemas are the first line of defense against bad data. They're pure functions — fast and easy to test.

| # | What to Test | Location | Status |
|---|---|---|---|
| 6 | Person schemas | `apps/web/lib/validations/person.ts` | **Covered** (8 tests) |
| 7 | Project schemas | `apps/web/lib/validations/project.ts` | **Covered** (8 tests) |
| 8 | Team member schemas | `apps/web/lib/validations/team-member.ts` | **Covered** (10 tests) |
| 9 | Milestone schemas | `apps/web/lib/validations/milestone.ts` | **Covered** (16 tests) — dates, status enums, assignees |
| 10 | Health assessment schemas | `apps/web/lib/validations/health-assessment.ts` | **Covered** (10 tests) |
| 11 | Quarterly goal schemas | `apps/web/lib/validations/quarterly-goal.ts` | **Covered** (12 tests) |
| 12 | Key result schemas | `apps/web/lib/validations/key-result.ts` | **Covered** (13 tests) |
| 13 | Arrangement schemas | `apps/web/lib/validations/arrangement.ts` | **Covered** (12 tests) |
| 14 | Project link schemas | `apps/web/lib/validations/project-link.ts` | **Covered** (10 tests) |
| 15 | Team schemas | `apps/web/lib/validations/team.ts` | **Covered** (11 tests) |

### P2: Pure Utility Functions

| # | What to Test | Location | Status |
|---|---|---|---|
| 16 | Tier assignment | `apps/web/lib/tiers.ts` | **Covered** (3 tests) |
| 17 | Title color map | `apps/web/lib/constants/team.ts` | **Covered** (3 tests) |
| 18 | Link icon matching | `apps/web/lib/constants/link-icons.ts` | **Covered** (19 tests) — all 15 services + case-insensitive + fallback |
| 19 | GitHub URL parsing | `packages/api/src/lib/github.ts` (`parseGitHubUrl`) | **Covered** (6 tests in P0 github.test.ts) |
| 20 | Cache key generation & invalidation | `packages/api/src/lib/cache.ts` | **Covered** (18 tests) — keys, TTLs, cached(), all invalidation helpers |

### P3: tRPC Procedure Logic

Only test procedures with non-trivial business logic beyond basic CRUD. Mock Prisma and Redis.

| # | What to Test | Location | Status |
|---|---|---|---|
| 21 | `person.list` — pagination, search, multi-project grouping | `packages/api/src/routers/person.ts` | **Covered** (8 tests) |
| 22 | `person.update` — manager cycle detection, manager change logging | `packages/api/src/routers/person.ts` | **Covered** (8 tests) — self-ref, cycle detection, manager change log, cache invalidation |
| 23 | `project.update` — parent cycle detection | `packages/api/src/routers/project.ts` | **Covered** (8 tests) — self-ref, cycle detection, parent/fundedBy cache invalidation |
| 24 | `arrangement.activate` — replaces live teams atomically | `packages/api/src/routers/arrangement.ts` | **Covered** (10 tests) — deactivate all, clear liveTeamId, recreate teams + memberships |
| 25 | `department.merge` / `title.merge` — re-parents entities then deletes sources | `packages/api/src/routers/department.ts`, `title.ts` | **Covered** (7 tests) — re-parent people/titles, delete merged, cache invalidation |
| 26 | `githubStats.syncNow` — rate limiting | `packages/api/src/routers/github-stats.ts` | **Covered** (4 tests) — no URL, invalid URL, success, sync failure |

---

## E2E Tests — Priority Order

All E2E tests run against Vercel preview deployments with Supabase seed data. Auth handled via `clerk.signIn()` in global setup with saved storage state.

### P0: Critical User Journeys

If these break, the app is unusable.

| # | Journey | File | Status |
|---|---|---|---|
| 1 | **App loads, auth works, basic navigation** — homepage, projects page, people page all load with content | `smoke.spec.ts` | **Covered** (4 tests) |
| 2 | **Projects list & detail** — list shows seeded projects, search filters, detail page loads with sidebar nav, overview shows metrics and sub-projects | `projects.spec.ts` | **Covered** (8 tests) — verify assertions match actual UI |
| 3 | **Team roster** — team page shows members grouped by team, search filters members | `team.spec.ts` | **Covered** (4 tests) — verify assertions match actual UI |

### P1: Core Feature Flows

These cover the primary read flows for each major feature.

| # | Journey | File | Status |
|---|---|---|---|
| 4 | **Health assessments** — list shows assessments, dimension categories visible, new assessment button exists | `health.spec.ts` | **Covered** (3 tests) — verified against seed data |
| 5 | **Roadmap** — milestones and quarterly goals sections visible with seeded data | `roadmap.spec.ts` | **Covered** (3 tests) — verified against seed data |
| 6 | **People directory** — people page shows seeded people, search filters, add button | `people.spec.ts` | **Covered** (4 tests) |
| 7 | **Project links** — links page loads, shows seeded links, add button, empty state | `links.spec.ts` | **Covered** (4 tests) |
| 8 | **Org chart** — org chart renders with seeded team hierarchy, manager relationships | `org-chart.spec.ts` | **Covered** (3 tests) |

### P2: Write Flows (Create / Edit / Delete)

These test mutations through the full stack. Higher maintenance cost but catch integration bugs.

| # | Journey | File | Status |
|---|---|---|---|
| 9 | **Create project** — open sheet, fill form, submit, verify appears in list | `project-crud.spec.ts` | **Covered** (1 test) |
| 10 | **Edit project** — open existing project sheet, change description, submit, verify sheet closes | `project-crud.spec.ts` | **Covered** (1 test) |
| 11 | **Add team member** — open add member sheet on team page, fill form, submit, verify appears | `team-crud.spec.ts` | **Covered** (1 test) |
| 12 | **Create health assessment** — navigate to new assessment, set overall status, submit, verify redirect | `health-crud.spec.ts` | **Covered** (1 test) |
| 13 | **Create milestone** — open sheet, fill title, submit, verify in roadmap | `roadmap-crud.spec.ts` | **Covered** (1 test) |

### P3: Advanced Features

Lower priority — these are important features but less frequently used.

| # | Journey | File | Status |
|---|---|---|---|
| 14 | **1:1 meetings** — create meeting for direct report, edit notes, verify on person profile | `meetings.spec.ts` | Not written |
| 15 | **Meeting templates** — create template, use it when creating a meeting, verify content pre-filled | `templates.spec.ts` | Not written |
| 16 | **Team arrangements** — view arrangements list, open editor, drag member between teams | `arrangements.spec.ts` | Not written |
| 17 | **GitHub stats** — stats page loads for project with GitHub URL, shows contributor table | `stats.spec.ts` | Not written |
| 18 | **Settings** — departments page loads, create department, add title | `settings.spec.ts` | Not written |
| 19 | **Department/title merge** — merge two departments, verify people reassigned | `settings.spec.ts` | Not written |

---

## Seed Data Requirements

E2E tests depend on `supabase/seed.sql`. As new E2E tests are written, expand the seed to include the entities they need. Current seed covers:

- Departments (Engineering, Design, Product)
- Titles (EM, SWE, Designer, PM)
- People (Alice, Bob, Carol, Diana — with manager relationships)
- Projects (Alpha with sub-project Beta, standalone Gamma)
- Teams (Frontend, Backend, Design)
- Team members (assigned to projects and teams)

**Still needed for future E2E tests:**

| E2E Test | Seed Data Needed |
|----------|-----------------|
| 1:1 meetings (#14) | A Person record linked to the E2E test user's Clerk ID, with a direct report |
| GitHub stats (#17) | A project with a real GitHub URL and some seeded `ContributorStats` rows |

---

## What NOT to Test

- **Component rendering in isolation** — no Storybook or React Testing Library. The E2E tests cover UI rendering with real data. Component snapshots add maintenance burden without catching real bugs.
- **tRPC endpoint wiring** — if `projects.spec.ts` shows projects, the router/procedure/Prisma chain works.
- **Prisma queries** — these are generated code. Test the business logic that wraps them, not the queries themselves.
- **Third-party integrations in unit tests** — Clerk auth, UploadThing uploads, QStash webhooks. These are integration points tested by E2E or manual smoke tests.
- **CSS / layout** — visual regression testing is out of scope. Rely on Playwright screenshots-on-failure for debugging.
