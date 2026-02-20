# Eng Hub

Engineering management dashboard for tracking projects, teams, people, and goals.

---

## What It Does

| Area | Features |
|------|----------|
| **Projects** | Health assessments, roadmaps, milestones, quarterly goals, team composition |
| **People** | Directory, org chart, manager hierarchies, department & title management |
| **GitHub** | Contributor stats, commit trends, PR & review tracking per project |
| **1:1s** | Meeting notes, templates, direct reports dashboard |

## Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | [Bun](https://bun.sh) |
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| API | [tRPC 11](https://trpc.io) |
| Database | PostgreSQL via [Supabase](https://supabase.com) + [Prisma](https://prisma.io) |
| Auth | [Clerk](https://clerk.com) |
| UI | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |

## Project Structure

```
apps/web        → Next.js frontend
packages/api    → tRPC router & GitHub integration
packages/db     → Prisma schema & client
packages/ui     → Shared UI components
```

## Getting Started

```bash
bun install
cp apps/web/.env.example apps/web/.env.local   # fill in your keys
cd packages/db && bun run db:push              # push schema to Supabase
bun dev                                        # start dev server
```

## Scripts

All scripts can be run from the root using `--filter`:

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
| `bun run --filter web test:watch` | Run tests in watch mode |
| `bun run --filter web ci` | Lint + typecheck + test |
