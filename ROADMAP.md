# Eng Hub — Feature Roadmap

## Why Supabase?

### Why not just raw PostgreSQL?

Supabase gives us a full platform on top of Postgres — not just a database. What Eng Hub actually uses today:

- **Preview branching** — Every PR gets an isolated database with migrations and seed data applied automatically. No manual DB setup for reviewers. Raw Postgres doesn't do this.
- **Row Level Security (RLS)** — All 31+ tables have RLS policies enforced at the database level. Even if someone bypasses the API layer, the database itself blocks unauthorized access. You *can* write RLS on raw Postgres, but Supabase makes it first-class with tooling and Studio visibility.
- **Local dev stack in one command** — `bunx supabase start` spins up Postgres 17, Auth (GoTrue), Storage (S3-compatible), Studio, and email testing (Inbucket). No custom Docker Compose to maintain, no version mismatches between developers. Raw Postgres gives you a database; Supabase gives you a dev environment.
- **Migration CLI** — `supabase db diff` auto-generates SQL migrations from schema changes. Migrations are plain `.sql` files — no ORM lock-in. They integrate directly with the branching workflow so PRs always have a matching database state.
- **Studio (database GUI)** — Built-in web UI at `localhost:54323` for browsing tables, running queries, inspecting RLS policies, and editing data. No need to install pgAdmin, DBeaver, or TablePlus.
- **Services ready when you need them** — Auth, Storage, Realtime (WebSocket), and Edge Functions are all configured and waiting. Today we use Clerk for auth and UploadThing for file uploads, but when we self-host we can swap to Supabase Auth and Supabase Storage with zero new infrastructure — they're already part of the stack.

Rolling your own Postgres means rebuilding all of this yourself: database branching, migration tooling, local dev orchestration, a GUI, and eventually auth and storage services. Supabase bundles it into one open-source platform.

### Why self-host Supabase instead of using Supabase Cloud?

Supabase Cloud is great for getting started (and is how Eng Hub runs today), but self-hosting is the better long-term fit for an internal engineering management tool:

- **Data sovereignty** — Performance reviews, 1:1 notes, compensation data, and health assessments are sensitive. Self-hosting keeps all of it on your own infrastructure. No third-party vendor has access to your people data.
- **No per-seat or usage costs** — Supabase Cloud charges by compute, storage, and bandwidth. An internal tool used daily by an engineering org hits those limits quickly. Self-hosted means a fixed infrastructure cost you control.
- **No vendor lock-in on hosting** — Deploy on AWS, GCP, Azure, bare metal, or a Raspberry Pi. Your data, your rules. If Supabase Cloud changes pricing or shuts down, you're unaffected.
- **Network locality** — Run the database in the same VPC or network as the app server. Lower latency, no egress costs, simpler network security model.
- **Full Postgres customization** — Tune `shared_buffers`, `work_mem`, `max_connections`, and other settings for your workload. Enable any Postgres extension. No waiting for a managed provider to support what you need.
- **Air-gapped and compliance environments** — Some organizations cannot send employee data to external SaaS providers. Self-hosted Supabase runs fully offline with no outbound network dependencies.

The tradeoff is managing your own backups, upgrades, and availability — but for an internal tool with a known user base, that's a reasonable trade for full data control.

### Why not Firebase, PlanetScale, Neon, etc.?

- **Supabase is open source (Apache 2.0)** — You can self-host the entire stack for free. Firebase is proprietary and cloud-only. PlanetScale removed its free tier and doesn't support self-hosting. Neon is cloud-focused.
- **It's just Postgres** — No proprietary query language, no vendor-specific wire protocol. Your data lives in standard PostgreSQL. You can migrate away at any time with `pg_dump`. Prisma, pgAdmin, and every Postgres tool in the ecosystem works out of the box.
- **Already in the stack** — Eng Hub already uses Supabase for migrations, preview branching, RLS, local dev, and seeding. There's no migration to do — just deploy the same stack on your own infrastructure.
- **Batteries included for the roadmap** — As Eng Hub grows, we can adopt Supabase Auth (replacing Clerk), Supabase Storage (replacing UploadThing), and Realtime (for live collaboration) without adding new services or vendors.

---

## 1. Self-Hosting with Supabase

Eng Hub already uses Supabase (PostgreSQL + Prisma) for its database layer. The goal is to make the entire platform easy to self-host for teams that want full control over their data.

### What's needed

- **Docker Compose setup** — Bundle Next.js app, Supabase (via `supabase/docker`), and any background workers into a single `docker-compose.yml` so teams can `docker compose up` and have a running instance.
- **Environment bootstrap script** — Interactive CLI (`bun run setup`) that generates `.env` files, creates the database, runs migrations, and seeds initial admin user.
- **Supabase self-hosted guide** — Document how to run Supabase locally or on your own infrastructure using [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting). Cover:
  - Docker deployment
  - External PostgreSQL (bring your own database)
  - Object storage (for file uploads, replacing UploadThing)
- **Remove hard cloud dependencies** — Make UploadThing, QStash, and Anthropic AI optional with local/self-hosted fallbacks:
  - UploadThing → Supabase Storage or local filesystem
  - QStash → Simple cron job or `node-cron`
  - Anthropic AI → Optional feature flag, disable gracefully when no API key
- **Helm chart / one-click deploys** — For teams on Kubernetes, provide a Helm chart. Consider one-click deploy buttons for Railway, Render, and Coolify.

---

## 2. Auth: Moving from Clerk to a Self-Hostable Solution

Clerk is excellent for managed auth but is a cloud-only SaaS — it can't be self-hosted. For a truly self-hostable platform, auth needs to be replaceable.

### Recommended path: Abstract auth behind an adapter

Rather than ripping out Clerk immediately, introduce an **auth adapter interface** so multiple providers can be supported:

```
AuthAdapter
  ├── ClerkAdapter       (current, for cloud/managed deployments)
  ├── SupabaseAuthAdapter (self-hosted, uses Supabase Auth / GoTrue)
  └── BetterAuthAdapter   (self-hosted, uses better-auth)
```

### Migration strategy

1. **Define an `AuthAdapter` interface** — Extract the auth contract:
   - `getCurrentUser(): { userId, email, role }`
   - `protectRoute()`
   - `handleWebhook()`
   - `getUserProfile()`

2. **Wrap current Clerk usage** — Move all Clerk-specific imports (`@clerk/nextjs`, `auth()`, `currentUser()`, `ClerkProvider`) behind the adapter. Today these touch:
   - `apps/web/app/layout.tsx` (ClerkProvider)
   - `packages/api/src/trpc.ts` (context creation)
   - `apps/web/app/api/webhooks/clerk/route.ts` (webhook)
   - E2E test helpers (Clerk testing tokens)

3. **Implement Supabase Auth adapter** — Best fit for self-hosting since Supabase Auth (GoTrue) is already part of the Supabase self-hosted stack:
   - Email/password, magic link, OAuth providers
   - Row Level Security (RLS) integration
   - No additional service to manage

4. **Implement better-auth adapter (alternative)** — [better-auth](https://www.better-auth.com/) is a popular self-hosted auth library for Next.js with built-in support for:
   - Email/password, OAuth, magic link, passkeys
   - Session management
   - Works with any PostgreSQL database (including existing Supabase DB)

5. **Configuration toggle** — Select auth provider via `AUTH_PROVIDER=clerk|supabase|better-auth` in `.env`.

---

## 3. People: Time Off, Sick Days & Travel Tracking

Add visibility into how team members spend their time beyond code.

### PTO & Sick Day Tracking

- **Log time-off entries** per person — type (PTO, sick, bereavement, parental leave), start/end dates, approval status
- **Dashboard on person profile** — Show YTD summary: days taken, days remaining (based on policy allocation), usage trend chart
- **Calendar view** — Visual calendar showing upcoming and past time off for a person or across a whole team
- **Team availability overlay** — On the project/team page, show who's out this week and next week
- **Alerts** — Flag when someone hasn't taken PTO in a long time (burnout risk) or has excessive sick days (wellbeing check-in prompt)

### Work Travel Tracking

- **Travel log** per person — destination, dates, purpose (client visit, conference, team offsite, etc.)
- **Travel summary** on person profile — total trips YTD, days on the road, travel frequency
- **Cost tracking** (optional) — Estimated or actual travel costs per trip for budget visibility
- **Overlap detection** — When planning travel, show who else from the team will be at the same location

---

## 4. Feature Ideas to Consider as You Scale

### Team & People

| Feature | Description |
|---------|-------------|
| **Skill matrix** | Track skills per person (languages, frameworks, domains). Visualize team skill coverage and identify gaps. |
| **Capacity planning** | Based on team size, PTO, and allocation percentages, forecast available engineering hours per sprint/quarter. |
| **Onboarding checklists** | Configurable onboarding task lists for new hires. Track completion per person. |
| **Offboarding workflow** | Checklist for departing team members — access revocation, knowledge transfer, handoff tracking. |
| **Compensation bands** | Track salary bands by level/title. Useful for budget planning and equity reviews (sensitive — needs strict ABAC). |
| **Tenure & anniversary tracking** | Surface work anniversaries and milestone tenures (1yr, 3yr, 5yr). |

### Project & Delivery

| Feature | Description |
|---------|-------------|
| **Incident tracking** | Log production incidents per project. Track MTTR, frequency, severity. Correlate with health assessments. |
| **Sprint/cycle analytics** | Import or manually log sprint velocity, carry-over, and burndown. Trend over quarters. |
| **Dependency mapping** | Visualize cross-project dependencies. Flag when a blocked project's dependency is unhealthy. |
| **Risk register** | Per-project risk log with likelihood, impact, mitigation plans, and owners. |
| **Release management** | Track releases, changelogs, and deployment frequency per project. Ties into DORA metrics. |
| **DORA metrics** | Deployment frequency, lead time, change failure rate, MTTR — the four key DevOps metrics. |
| **Technical debt tracker** | Log and prioritize tech debt items per project. Track debt paydown over time. |
| **Architecture decision records (ADRs)** | Store and surface architectural decisions per project with context and rationale. |

### Communication & Collaboration

| Feature | Description |
|---------|-------------|
| **Slack integration** | Post health status changes, milestone completions, and team updates to Slack channels. |
| **Email digests** | Weekly summary emails for managers — team health, upcoming milestones, PTO coverage. |
| **Notification center** | In-app notifications for health changes, goal updates, review deadlines, and mentions. |
| **Meeting agenda builder** | Auto-generate 1:1 agendas from open goals, recent PRs, health changes, and pending reviews. |
| **Handoff reports** | When a person changes managers, auto-generate a handoff report with goals, review history, and notes. |

### Reporting & Analytics

| Feature | Description |
|---------|-------------|
| **Executive dashboard** | High-level view across all projects — health distribution, headcount trends, delivery velocity, budget burn. |
| **Custom report builder** | Let managers build their own views by combining data dimensions (people x projects x time). |
| **Export to CSV/PDF** | Export any table or report for offline sharing or exec presentations. |
| **Audit log** | Track who changed what and when. Essential for compliance and accountability. |
| **Data retention policies** | Configurable retention for sensitive data (reviews, compensation) for compliance. |

### Platform & Infrastructure

| Feature | Description |
|---------|-------------|
| **Multi-tenancy** | Support multiple orgs/companies in a single deployment. Useful for consulting firms or MSPs. |
| **SSO / SAML** | Enterprise SSO via SAML or OIDC for larger organizations. Pairs well with the auth adapter work. |
| **API access (public API)** | Expose a documented REST or GraphQL API for external integrations and automation. |
| **Webhooks (outgoing)** | Let users subscribe to events (health changed, milestone completed) and push to external systems. |
| **Plugin system** | Allow community or internal extensions without forking. Hook into lifecycle events. |
| **Mobile responsive / PWA** | Optimize for mobile usage — quick health checks, 1:1 notes on the go. |
| **Dark mode** | Already have theme toggle infrastructure — ensure full dark mode coverage. |
| **Internationalization (i18n)** | Support multiple languages for global teams. |
| **RBAC → full ABAC expansion** | The ABAC system exists — extend it with more granular capabilities as features grow. |

---

## 5. Suggested Priority Phases

### Phase 1 — Foundation for Self-Hosting
- Auth adapter interface + Supabase Auth implementation
- Docker Compose for local self-hosting
- Replace UploadThing with Supabase Storage option
- Replace QStash with local cron option
- Self-hosting documentation

### Phase 2 — People Insights
- PTO and sick day tracking
- Work travel logging
- Team availability calendar
- Person profile enhancements (tenure, time-off summary)

### Phase 3 — Delivery & Visibility
- DORA metrics
- Incident tracking
- Sprint/cycle analytics
- Executive dashboard

### Phase 4 — Communication & Integration
- Slack integration
- Email digests
- Notification center
- Auto-generated 1:1 agendas

### Phase 5 — Platform Maturity
- Multi-tenancy
- SSO / SAML
- Public API
- Plugin system
- Audit log
