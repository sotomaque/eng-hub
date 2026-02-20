# Upstash Redis & QStash Integration

## Overview

eng-hub uses **Upstash Redis** for caching and rate limiting, and **Upstash QStash** for background job scheduling. Both are HTTP-based, serverless-friendly services that work with Vercel/Edge runtimes.

## Redis: Caching

### What's Cached

| Entity | Cache Key | TTL | Invalidated By |
|--------|-----------|-----|----------------|
| Departments (all) | `enghub:departments:all` | 24h | Create/update/delete/merge department |
| Titles (all) | `enghub:titles:all` | 24h | Create/update/delete/reorder/merge title |
| Project list | `enghub:projects:list` | 1h | Create/update/delete project, any sub-resource mutation |
| Project by ID | `enghub:project:{id}` | 1h | Update/delete project, health assessment, team, team member, milestone, quarterly goal, key result, project link mutations |
| People (all) | `enghub:people:all` | 30m | Create/update/delete person, join/leave/move project, claim/unclaim |
| Person (me) | `enghub:person-me:{clerkUserId}` | 1h | Update/delete person, claim/unclaim |
| Clerk → Person ID | `enghub:clerk-person:{clerkUserId}` | 1h | Claim/unclaim |
| Management chain | `enghub:mgmt-chain:{personId}` | 30m | Manager change, person delete |
| GitHub stats | `enghub:github-stats:{projectId}` | 1h | GitHub sync completion |
| Meeting templates | `enghub:meeting-templates:all` | 24h | Create/update/delete template |

### Cache Strategy

**Cache-aside** pattern using the `cached()` helper:

```typescript
import { cached, cacheKeys, ttl } from "../lib/cache";

// Automatically checks Redis, falls back to DB, caches result
const data = await cached(cacheKeys.departments, ttl.referenceData, () =>
  db.department.findMany({ orderBy: { name: "asc" } })
);
```

The return type is inferred from the `fetch` function, preserving full type safety through tRPC.

### Eviction

**Upstash LRU eviction is enabled.** When the database hits its memory limit, least-recently-used keys are automatically removed. This means:

- **TTLs are for freshness, not memory cleanup** — we set TTLs to guarantee data freshness
- **Explicit invalidation is the primary mechanism** — mutations delete stale keys immediately; TTLs are a safety net
- **No manual eviction logic needed** — Upstash handles memory pressure transparently

### Invalidation

Each mutation calls the relevant invalidation helper:

```typescript
import { invalidateProjectCache, invalidateReferenceData } from "../lib/cache";

// After updating a department
await invalidateReferenceData(); // Deletes departments + titles cache

// After updating a milestone (sub-resource of project)
await invalidateProjectCache(projectId); // Deletes project:{id} + projects:list
```

Available helpers:
- `invalidateReferenceData()` — departments + titles
- `invalidateProjectCache(projectId)` — specific project + project list
- `invalidatePeopleCache(clerkUserId?)` — people list + optionally person-me
- `invalidateMgmtChain(personId)` — management chain for a person
- `invalidateGithubStats(projectId)` — GitHub stats for a project
- `invalidateMeetingTemplates()` — meeting template list

## Redis: Rate Limiting

Three tiers of rate limiting via `@upstash/ratelimit`:

| Tier | Limit | Window | Applied To |
|------|-------|--------|------------|
| General | 100 requests | 60s sliding | All queries |
| Mutation | 30 requests | 60s sliding | All mutations |
| Strict | 3 requests | 300s fixed | Expensive operations (e.g., GitHub sync) |

Rate limiting is applied as tRPC middleware after authentication. The middleware selects the general or mutation limiter based on the procedure type. The strict limiter is called explicitly in specific mutations.

## QStash: Background GitHub Sync

### Problem

GitHub sync fetches commit and PR stats from the GitHub API, which takes 10-30 seconds. Running this synchronously blocks the user's request.

### Solution

QStash provides a message queue that calls back to our API endpoint asynchronously:

1. **On-demand sync** (`syncNow` mutation): Runs the sync directly but with strict rate limiting (3 per 5 minutes)
2. **Scheduled sync**: Configure in QStash dashboard to POST to `/api/cron/github-sync` on a schedule (e.g., every 6 hours)
3. **Single-project sync**: POST with `{ "projectId": "..." }` to sync one project
4. **All-projects sync**: POST with empty body to sync all projects with GitHub URLs

### Cron Route

The endpoint at `apps/web/app/api/cron/github-sync/route.ts`:
- Verifies QStash signatures (prevents unauthorized calls)
- Supports single-project or all-projects sync
- Returns sync results as JSON

### Setup

1. Create a QStash instance at [console.upstash.com](https://console.upstash.com) → QStash
2. Add these env vars (see `.env.example`):
   - `QSTASH_URL`
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`
3. (Optional) Create a schedule in QStash dashboard pointing to your `/api/cron/github-sync` endpoint

## Environment Variables

All variables are in `apps/web/env.ts` and documented in `apps/web/.env.example`:

| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Redis REST API endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Redis authentication token |
| `QSTASH_URL` | QStash API endpoint |
| `QSTASH_TOKEN` | QStash authentication token |
| `QSTASH_CURRENT_SIGNING_KEY` | Verifies QStash webhook signatures |
| `QSTASH_NEXT_SIGNING_KEY` | Next rotation key for signature verification |

## Testing

```bash
cd packages/api && bun test
```

Tests cover:
- Cache key generation (static and dynamic keys)
- TTL values
- `cached()` helper (cache hit, miss, nullable results)
- All invalidation helpers (correct keys deleted)
- Management chain authorization (cache hit/miss, cycle detection, clerk-person mapping)

## Files

| File | Purpose |
|------|---------|
| `packages/api/src/lib/redis.ts` | Singleton Upstash Redis client |
| `packages/api/src/lib/cache.ts` | Cache keys, TTLs, `cached()` helper, invalidation functions |
| `packages/api/src/lib/hierarchy.ts` | Management chain authorization with Redis Set caching |
| `packages/api/src/lib/github-sync.ts` | Extracted sync logic for tRPC + QStash reuse |
| `packages/api/src/trpc.ts` | Rate limiting middleware |
| `apps/web/app/api/cron/github-sync/route.ts` | QStash webhook receiver |
