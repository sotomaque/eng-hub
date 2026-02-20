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
cd packages/db && bun run db:push              # push schema to Supabase
bun dev                                        # start dev server
```

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
| `bun run --filter web ci` | Lint + typecheck + test |
| `bun run knip` | Check for dead code and unused dependencies |
