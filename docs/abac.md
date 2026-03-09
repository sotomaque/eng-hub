# Attribute-Based Access Control (ABAC)

## Overview

Eng Hub uses ABAC to control what users can see and do. The system is built on three database tables and a capability-based permission model.

## Data Model

### AccessProfile

A named bundle of capabilities (e.g., "Admin", "Full Access", "Project Member").

- `capabilities: string[]` — list of capability keys
- `isDefault: boolean` — auto-granted to new users via Clerk webhook

### AccessGrant

Links a person to a profile, optionally scoped to a project.

- `personId` + `profileId` + `projectId` (nullable)
- Global grant (`projectId = null`) — capabilities apply everywhere
- Project-scoped grant — capabilities apply only to that project

### AccessOverride

Per-person allow/deny overrides for individual capabilities. Processed after grants.

## Capability Namespace

All capabilities follow the pattern `resource:action` or `resource:sub:action`:

| Prefix | Examples |
|--------|----------|
| `admin:` | `admin:access` |
| `project:` | `project:read`, `project:write`, `project:delete` |
| `project:health:` | `project:health:read`, `project:health:write` |
| `project:budget:` | `project:budget:read`, `project:budget:write` |
| `project:team:` | `project:team:read`, `project:team:write` |
| `project:roadmap:` | `project:roadmap:read`, `project:roadmap:write` |
| `project:links:` | `project:links:read`, `project:links:write` |
| `project:stats:` | `project:stats:read` |
| `project:arrangements:` | `project:arrangements:read`, `project:arrangements:write` |
| `person:` | `person:read`, `person:write` |
| `person:goals:` | `person:goals:read`, `person:goals:write` |
| `person:reviews:` | `person:reviews:read`, `person:reviews:write` |
| `person:meetings:` | `person:meetings:read`, `person:meetings:write` |
| `person:comments:` | `person:comments:read`, `person:comments:write` |
| `settings:` | `settings:read`, `settings:write` |

## Resolution Order

1. Collect capabilities from all granted profiles (global + project-scoped)
2. Apply overrides: `deny` removes, `allow` adds
3. `admin:access` bypasses all checks
4. Manager hierarchy auto-grants `MANAGER_INHERITED_CAPABILITIES` for direct/indirect reports

See `packages/api/src/lib/access.ts` for the full resolution logic.

## Default Profiles

| Profile | Key capabilities | Notes |
|---------|-----------------|-------|
| **Admin** | All capabilities + `admin:access` | Full control |
| **Full Access** | All read/write (no `admin:access`) | Default for new users |
| **Project Member** | `project:team:read`, `project:roadmap:read`, `project:links:read`, `person:read` | No `project:read` — scoped to team membership |
| **Project Viewer** | `project:read` only | Can see all projects, nothing else |

## Key Behaviors

### Project Visibility (`/projects`)

- Users with global `project:read` or `admin:access` see all projects
- Other users see only projects where they are an active team member (`TeamMember` with no `leftAt`) or have project-scoped access grants

### Frontend Gating

The `useAccess()` hook (`apps/web/lib/hooks/use-access.ts`) provides:
- `can(capability, projectId?)` — check a single capability
- `isAdmin` — shortcut for admin check

Used in: project sidebar nav, project overview cards, projects table columns/actions, main nav admin link.

### Server-Side Enforcement

- tRPC middleware: `requireCapability(cap)` and `requirePersonCapability(cap)`
- Server components: check via `trpc.access.myAccess()` before rendering sheets
- Project list queries: `buildProjectListWhere()` in `packages/api/src/routers/project.ts`

### Admin UI

- `/admin/permissions` — manage grants (assign/remove profiles for users)
- `/admin/permissions/profiles` — CRUD access profiles with capability checklists

## E2E Testing

The `e2e/abac.spec.ts` test file runs under the `restricted` Playwright project using a second test user (Bob Jones / Project Member). It verifies:

- Project list scoping (only sees member projects)
- Health column/filter hidden without `project:health:read`
- Write/delete actions hidden without `project:write`/`project:delete`
- URL manipulation blocked for create/edit sheets
- Project overview card gating (health, budget)
- Sidebar nav gating
- Admin access denied

Requires `E2E_CLERK_USER_USERNAME_2` and `E2E_CLERK_USER_PASSWORD_2` env vars.

## Files

| File | Purpose |
|------|---------|
| `packages/api/src/lib/access.ts` | Resolution engine, capability checks |
| `packages/api/src/lib/capabilities.ts` | Capability constants |
| `packages/api/src/routers/access.ts` | Admin CRUD + `myAccess` endpoint |
| `apps/web/lib/hooks/use-access.ts` | Client-side `useAccess()` hook |
| `supabase/migrations/20260309000000_add-access-control.sql` | Database migration |
