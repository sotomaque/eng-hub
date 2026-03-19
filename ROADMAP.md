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

## 2. Auth: Moving from Clerk to a Self-Hostable Solution ⚙️ In Progress

Clerk is excellent for managed auth but is a cloud-only SaaS — it can't be self-hosted. For a truly self-hostable platform, auth needs to be replaceable.

### Recommended path: Abstract auth behind an adapter

Rather than ripping out Clerk immediately, introduce an **auth adapter interface** so multiple providers can be supported:

```
@workspace/auth
  ├── ClerkAdapter       ✅ implemented (current, for cloud/managed deployments)
  ├── SupabaseAuthAdapter 🔲 stub only (self-hosted, uses Supabase Auth / GoTrue)
  └── BetterAuthAdapter   🔲 stub only (self-hosted, uses better-auth)
```

### Migration strategy

1. ✅ **Define an `AuthAdapter` interface** — `packages/auth` package with `ServerAuthAdapter` and `ClientAuthAdapter` types.

2. ✅ **Wrap current Clerk usage** — All Clerk-specific imports moved behind the adapter. Switched callsites:
   - `apps/web/app/layout.tsx` — `AuthProvider` (was `ClerkProvider`)
   - `packages/api/src/trpc.ts` — `getServerSession()` (was `auth()`)
   - `apps/web/components/app-header.tsx` — `SignedIn`, `SignedOut`, `SignInButton`
   - `apps/web/components/mobile-nav.tsx` — `useAuthSession()` (was `useUser()`)
   - `apps/web/lib/uploadthing.ts` — `getServerSession()`
   - `apps/web/app/api/compare-summary/route.ts` — `getServerSession()`

   Still Clerk-specific (follow-on work):
   - `AppUserButton` — Clerk `UserButton` with shadcn theme + menu items
   - `packages/api/src/routers/admin.ts` — `clerkClient()` for waitlist/invitations
   - `apps/web/app/api/webhooks/clerk/route.ts` — svix webhook handler
   - E2E test helpers — `@clerk/testing/playwright`

3. 🔲 **Wrap remaining Clerk-specific callsites** — Complete the adapter boundary:
   - Abstract `AppUserButton` behind a `UserButton` export in `@workspace/auth/client`
   - Move `clerkClient` admin operations (invitations, waitlist) behind an `AdminAuthAdapter`
   - Abstract the webhook handler behind a provider-agnostic user-sync endpoint

4. 🔲 **Implement Supabase Auth adapter** — Best fit for self-hosting since Supabase Auth (GoTrue) is already part of the Supabase self-hosted stack:
   - Email/password, magic link, OAuth providers
   - Row Level Security (RLS) integration
   - No additional service to manage

5. 🔲 **Implement better-auth adapter (alternative)** — [better-auth](https://www.better-auth.com/) is a popular self-hosted auth library for Next.js with built-in support for:
   - Email/password, OAuth, magic link, passkeys
   - Session management
   - Works with any PostgreSQL database (including existing Supabase DB)

6. ✅ **Configuration toggle** — Select auth provider via `AUTH_PROVIDER=clerk|supabase|better-auth` in `.env`.

---

## 3. Storage: Migrating from UploadThing to Supabase S3 Storage ⚙️ In Progress

UploadThing works well as a managed file upload service, but like Clerk it's a cloud-only SaaS — it can't be self-hosted. For a fully self-hostable platform, file storage needs the same adapter treatment as auth.

### Current usage

UploadThing is used in two places today:

| Route / File | Purpose |
|---|---|
| `apps/web/lib/uploadthing.ts` | File router — defines `imageUploader` (4 MB) and `pdfUploader` (16 MB) with auth middleware |
| `apps/web/lib/uploadthing-components.ts` | Client helpers — `UploadButton` and `useUploadThing` hook |
| `apps/web/app/api/uploadthing/route.ts` | Next.js API route handler (`GET`, `POST`) |
| `apps/web/components/image-uploader.tsx` | UI component — uses `useUploadThing("imageUploader")` for avatar/image uploads |
| `apps/web/components/performance-review-sheet.tsx` | UI component — uses upload for review attachments |

### Recommended path: Abstract storage behind an adapter

Follow the same pattern as `packages/auth` — define a storage adapter interface and swap implementations via an env var:

```
packages/storage/src/
├── types.ts                        # StorageAdapter interface
├── server.ts                       # Server entry point (dynamic adapter selection)
├── client.tsx                      # Client entry point (hooks & components)
└── adapters/
    ├── uploadthing/                # Current provider (cloud/managed)
    │   ├── server.ts
    │   └── client.tsx
    └── supabase/                   # Self-hosted (S3-compatible)
        ├── server.ts
        └── client.tsx
```

### Migration strategy

1. ✅ **Define a `StorageAdapter` interface** — `packages/storage/src/types.ts` with `StorageBucket`, `UseFileUploadOptions`, `UseFileUploadResult`, `PresignRequest`, `PresignResponse`.

2. ✅ **Create the `packages/storage` package** — Mirror the structure of `packages/auth`:
   - `server.ts` re-exports Supabase presign helper
   - `client.tsx` re-exports `useSupabaseFileUpload` hook
   - `apps/web/lib/storage.tsx` factory: selects UploadThing bridge (default) or Supabase via `NEXT_PUBLIC_STORAGE_PROVIDER`

3. ✅ **Wrap current UploadThing usage** — All UploadThing-specific imports moved behind the adapter:
   - `apps/web/components/image-uploader.tsx` — `useFileUpload("images")` (was `useUploadThing("imageUploader")`)
   - `apps/web/components/performance-review-sheet.tsx` — `useFileUpload("documents")` (was `useUploadThing("pdfUploader")`)
   - `apps/web/app/api/storage/presign/route.ts` — new presign endpoint for Supabase adapter

4. ✅ **Implement Supabase Storage adapter** — Best fit for self-hosting since Supabase Storage is already part of the self-hosted stack:
   - Uses S3-compatible API under the hood — works with any S3 client
   - Buckets configured via Supabase Dashboard or SQL migrations (`storage.buckets`)
   - RLS policies on `storage.objects` for fine-grained access control
   - Supports public and private buckets with signed URL generation
   - File size limits enforced at the bucket level
   - No additional service to deploy — already running in `supabase start`

5. ✅ **Update components** — Swap upload call sites to use the new adapter:
   - `image-uploader.tsx` → `useFileUpload("images")` (done)
   - `performance-review-sheet.tsx` → `useFileUpload("documents")` (done)
   - `apps/web/app/api/uploadthing/route.ts` — keep for now (still needed when `STORAGE_PROVIDER=uploadthing`)

6. ✅ **Configuration toggle** — Select storage provider via `NEXT_PUBLIC_STORAGE_PROVIDER=uploadthing|supabase` in `.env`:

   ```env
   # Cloud/managed deployment (current default)
   STORAGE_PROVIDER=uploadthing
   UPLOADTHING_TOKEN=your_token_here

   # Self-hosted deployment
   STORAGE_PROVIDER=supabase
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

7. **Supabase bucket setup** — Add SQL migration for storage buckets:

   ```sql
   -- Create buckets for file uploads
   insert into storage.buckets (id, name, public, file_size_limit)
   values
     ('images', 'images', true, 4194304),      -- 4 MB, public
     ('documents', 'documents', false, 16777216); -- 16 MB, private

   -- RLS: authenticated users can upload to their own folder
   create policy "Users can upload files"
     on storage.objects for insert
     with check (auth.uid()::text = (storage.foldername(name))[1]);

   -- RLS: anyone can read public bucket files
   create policy "Public read for images"
     on storage.objects for select
     using (bucket_id = 'images');
   ```

### Activating Supabase Storage

After merging the storage adapter PR, **UploadThing remains the active provider** — `NEXT_PUBLIC_STORAGE_PROVIDER` is not set in Vercel, so the default (`uploadthing`) applies. The Supabase adapter is wired up but dormant. No existing behavior changes.

#### Step 1 — Create buckets

Run in the Supabase dashboard or add as a migration:

```sql
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('images', 'images', true, 4194304),        -- 4 MB, public
  ('documents', 'documents', false, 16777216)  -- 16 MB, private
on conflict (id) do nothing;
```

#### Step 2 — Flip the env var in Vercel

```env
NEXT_PUBLIC_STORAGE_PROVIDER=supabase
SUPABASE_SERVICE_ROLE_KEY=<service role key from Supabase dashboard>
NEXT_PUBLIC_SUPABASE_URL=<already set if using Supabase branching>
```

New uploads will go to Supabase immediately. Existing UploadThing URLs stored in the database continue to work — they're public CDN links and don't expire.

#### Step 3 — Backfill existing files (optional)

```ts
// One-off migration script: bun run scripts/migrate-storage.ts
import { db } from "@workspace/db";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Example: migrate person avatars
const people = await db.person.findMany({ where: { avatarUrl: { contains: "ufs.sh" } } });
for (const person of people) {
  const res = await fetch(person.avatarUrl!);
  const blob = await res.blob();
  const key = `migrated/${crypto.randomUUID()}.jpg`;
  await supabase.storage.from("images").upload(key, blob);
  const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(key);
  await db.person.update({ where: { id: person.id }, data: { avatarUrl: publicUrl } });
}
```

Repeat for each model that stores file URLs (`performanceReview.pdfUrl`, etc.).

#### Step 4 — Remove UploadThing (optional cleanup)

Once all URLs are backfilled, remove `UPLOADTHING_TOKEN` from Vercel and delete `apps/web/app/api/uploadthing/route.ts`.

### Why Supabase Storage over other S3 alternatives?

- **Already in the stack** — `supabase start` launches Storage alongside Postgres and Auth. Zero additional infrastructure.
- **RLS integration** — Access control policies live in the database, same as every other table. No separate IAM or ACL system.
- **S3-compatible** — If teams later want to point at AWS S3, MinIO, or R2, the S3-compatible API makes it a config change.
- **Consistent tooling** — Buckets, policies, and files are visible in Supabase Studio alongside the rest of the database.

---

## 4. People: Time Off, Sick Days & Travel Tracking

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

## 5. Feature Ideas to Consider as You Scale

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

## 6. Suggested Priority Phases

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
