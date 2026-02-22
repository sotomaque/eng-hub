# Eng Hub

A unified engineering management platform that replaces the patchwork of Figma boards, spreadsheets, personal docs, and manual repo spelunking with a single source of truth for project health, team composition, goal tracking, 1-on-1s, and delivery insights.

---

## Why

Engineering management tooling is fragmented. Project health lives in static Figma boards with no history. 1-on-1 notes are scattered across personal tools with no continuity when reports change managers. Goals are tracked inconsistently. Team composition is invisible beyond org charts. Delivery data requires manually checking GitHub.

Eng Hub consolidates all of it into one platform purpose-built for the way engineering organizations actually operate.

## Features

| Area | What it does |
|------|-------------|
| **Project Home Pages** | Centralized hub per project with description, team roster, health status, milestones, goals, and curated links to Figma, repos, docs |
| **Health Tracking** | 8-dimension assessments (Growth, Margin, Longevity, Client Sat, Eng/Product/Design Vibe) with rich notes, full history, and at-a-glance status |
| **1:1 Meeting Notes** | Rich text notes organized by direct report, reusable templates, management chain visibility, and seamless handoff when reports change managers |
| **Goal Management** | Hierarchical milestones and quarterly goals with key results, assignees, status tracking, and target dates |
| **Team Arrangements** | Drag-and-drop team editor, seniority composition bars, draft arrangements before committing, org chart per project |
| **Delivery Insights** | Automated GitHub stats -- commits, PRs, reviews, trends -- with visual dashboards and an insights engine |
| **People Directory** | Searchable directory with profiles, manager hierarchies, department/title taxonomy, and manager change audit trail |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19 |
| API | [tRPC 11](https://trpc.io) with Zod validation |
| Database | PostgreSQL via [Supabase](https://supabase.com) + [Prisma](https://prisma.io) |
| Cache | [Upstash Redis](https://upstash.com) with TTL-based invalidation |
| Auth | [Clerk](https://clerk.com) with management chain-based visibility |
| UI | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Quality | Biome linting, Knip dead code detection, Playwright E2E |

## Project Structure

```
apps/web        → Next.js frontend
packages/api    → tRPC routers, GitHub integration, caching, rate limiting
packages/db     → Prisma schema & client
packages/ui     → Shared UI components (shadcn/ui)
```

## Getting Started

```bash
bun install
cp apps/web/.env.example apps/web/.env.local   # fill in your keys
bun dev                                        # start dev server
```

See [Environment Setup](#environment-setup) for detailed configuration.

---

## Development Workflows

### Running local dev

1. Copy the example env and fill in your keys:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```
2. Add your database URLs to `apps/web/.env.local` (pooled + direct) and `packages/db/.env` (same two URLs).
3. Generate the Prisma client and start the dev server:
   ```bash
   cd packages/db && bun run db:generate
   bun dev
   ```

The app runs at `http://localhost:3000` with Turbopack HMR.

### Pointing at a deployed preview branch

When you open a PR, Supabase automatically creates an isolated preview database from `supabase/migrations/` and applies `supabase/seed.sql`. Vercel deploys a preview of the app with the Supabase-provided env vars injected automatically.

To point your **local** dev server at a preview branch database:

1. Go to [Supabase dashboard](https://supabase.com/dashboard) → your project → the preview branch → **Settings → Database → Connection string**
2. Copy the pooled (port 6543) and direct (port 5432) connection strings
3. Paste them into `apps/web/.env.local.preview` and `packages/db/.env.preview`
4. Switch your local environment:
   ```bash
   cd apps/web && bun run env:preview
   ```
5. Start the dev server:
   ```bash
   bun dev
   ```

The preview database has seed data (projects, people, teams) so you can develop and run E2E tests locally against real data.

### Running locally against production

To switch back to the production database:

```bash
cd apps/web && bun run env:prod
```

This copies `apps/web/.env.local.prod` → `.env.local` and `packages/db/.env.prod` → `packages/db/.env`.

> **Tip:** The toggle scripts update both the web app env and the Prisma CLI env, so `prisma db push` and `prisma studio` will also point at the correct database.

### Environment file layout

```
apps/web/
  .env               ← shared keys (Clerk, Redis, GitHub, etc.) — gitignored
  .env.local          ← DB URLs for current session — gitignored, swapped by toggle scripts
  .env.local.prod     ← production DB URLs — gitignored
  .env.local.preview  ← preview branch DB URLs — gitignored
  .env.example        ← template with all required keys — committed

packages/db/
  .env                ← DB URLs for Prisma CLI — gitignored, swapped by toggle scripts
  .env.prod           ← production DB URLs — gitignored
  .env.preview        ← preview branch DB URLs — gitignored
```

---

## Database (Supabase)

The project uses **Supabase** for PostgreSQL with **Prisma** as the ORM. Schema changes go through Supabase migrations (not `prisma migrate`), and Prisma is used only for client generation.

### First-time setup

```bash
bunx supabase login                              # authenticate with Supabase
bunx supabase link --project-ref <PROJECT_REF>   # link to your Supabase project
bunx supabase db pull                            # pull baseline migration from production
```

### Making schema changes

1. Edit `packages/db/prisma/schema.prisma`
2. Apply to local/dev DB: `cd packages/db && bunx prisma db push`
3. Generate migration: `cd packages/db && bun run db:migrate:new <descriptive_name>`
4. Verify: `bunx supabase db reset` (replays all migrations + seed)
5. Generate Prisma client: `cd packages/db && bun run db:generate`
6. Commit both `schema.prisma` and the new `supabase/migrations/<timestamp>_<name>.sql`

### Key commands

| Command | Description |
|---------|-------------|
| `cd packages/db && bun run db:generate` | Regenerate Prisma client |
| `cd packages/db && bun run db:migrate:new <name>` | Generate a new migration from schema diff |
| `cd packages/db && bun run db:reset` | Drop & recreate DB from migrations + seed |
| `cd packages/db && bun run db:studio` | Open Prisma Studio |
| `bunx supabase db pull` | Pull remote schema as a migration |
| `bunx supabase db push` | Push local migrations to remote |

### Preview environments (Supabase Branching)

When a PR is opened, Supabase automatically creates an isolated preview database from the migrations in `supabase/migrations/`. Seed data from `supabase/seed.sql` is applied after migrations. On merge, migrations run against production automatically. The preview branch database is deleted on PR close.

---

## Testing

### Unit tests

Unit tests use `bun:test` and live in `__tests__/` directories alongside the code they test.

```bash
cd apps/web && bun run test              # run all unit tests
cd apps/web && bun run test:watch        # watch mode
cd packages/api && bun test             # run API package tests directly
```

### E2E tests

E2E tests use [Playwright](https://playwright.dev) with [Clerk Testing Tokens](https://clerk.com/docs/testing/playwright) for authentication bypass. Tests run against seed data in `supabase/seed.sql`.

**Running locally against a preview branch** (recommended):

1. Switch to the preview database: `cd apps/web && bun run env:preview`
2. Start the dev server: `bun dev`
3. In a separate terminal, run the tests:
   ```bash
   cd apps/web && bun run test:e2e
   ```

**Other modes:**

```bash
cd apps/web && bun run test:e2e          # headless (starts dev server if needed)
cd apps/web && bun run test:e2e:ui       # Playwright UI mode
cd apps/web && bun run test:e2e:headed   # headed browser
cd apps/web && bun run test:e2e:debug    # step-through debugger
```

**Running against a deployed preview URL:**

```bash
PLAYWRIGHT_TEST_BASE_URL=https://your-preview.vercel.app \
  cd apps/web && bun run test:e2e
```

Tests live in `apps/web/e2e/` and import `{ test, expect }` from `./helpers` (which injects Clerk testing tokens).

In CI, the E2E job waits for the Vercel preview deployment, then runs tests against it.

---

## Scripts

```bash
bun run dev                        # start all workspaces
bun run --filter web dev           # start web app only
```

| Command | Description |
|---------|-------------|
| `bun run --filter web lint` | Lint with Biome |
| `bun run --filter web lint:fix` | Lint + auto-fix |
| `bun run --filter web typecheck` | TypeScript type-check |
| `bun run --filter web test` | Run unit tests |
| `bun run --filter web test:e2e` | Run E2E tests |
| `bun run --filter web ci` | Lint + typecheck + test |
| `bun run knip` | Check for dead code and unused dependencies |
| `cd apps/web && bun run env:prod` | Switch local env to production DB |
| `cd apps/web && bun run env:preview` | Switch local env to preview branch DB |
