# Upstash QStash Integration

## Overview

eng-hub uses **Upstash QStash** for background job scheduling. QStash is an HTTP-based, serverless-friendly message queue that works with Vercel/Edge runtimes.

## QStash: Background GitHub Sync

### Problem

GitHub sync fetches commit and PR stats from the GitHub API, which takes 10-30 seconds. Running this synchronously blocks the user's request.

### Solution

QStash provides a message queue that calls back to our API endpoint asynchronously:

1. **On-demand sync** (`syncNow` mutation): Runs the sync directly
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
| `QSTASH_URL` | QStash API endpoint |
| `QSTASH_TOKEN` | QStash authentication token |
| `QSTASH_CURRENT_SIGNING_KEY` | Verifies QStash webhook signatures |
| `QSTASH_NEXT_SIGNING_KEY` | Next rotation key for signature verification |

## Files

| File | Purpose |
|------|---------|
| `packages/api/src/lib/github-sync.ts` | Extracted sync logic for tRPC + QStash reuse |
| `apps/web/app/api/cron/github-sync/route.ts` | QStash webhook receiver |
