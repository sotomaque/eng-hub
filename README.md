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

## E2E Tests

E2E tests use [Playwright](https://playwright.dev) with [Clerk Testing Tokens](https://clerk.com/docs/testing/playwright) for authentication bypass.

```bash
cd apps/web && bun run test:e2e          # run tests (starts dev server if needed)
cd apps/web && bun run test:e2e:ui       # run tests with Playwright UI
cd apps/web && bun run test:e2e:headed   # run tests in headed browser
```

Tests live in `apps/web/e2e/` and import `{ test, expect }` from `./helpers` (which injects Clerk testing tokens). The `PLAYWRIGHT_TEST_BASE_URL` env var can be set to run tests against a deployed preview URL instead of localhost.

In CI, the E2E job waits for the Vercel preview deployment, then runs tests against it.

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
