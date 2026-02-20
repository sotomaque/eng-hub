# eng-hub Feature Roadmap — Implementation Plan

## Context

eng-hub is an engineering management tool. The current MVP covers projects, teams, members, arrangements, milestones, goals, and health status. This plan adds 9 features to make it a comprehensive EM platform: people management foundations, 1:1 workflows, performance tracking, and developer analytics.

**Implementation order** (foundation first — multi-team and reporting structure unlock other features):

| Phase | Feature | Complexity | Status |
|-------|---------|------------|--------|
| 1 | Multi-team membership | Medium | DONE |
| 2 | Reporting structure + org chart | Medium-Large | DONE |
| 3 | Free-text notes on people + Member Profile Page | Small-Medium | DONE |
| 4 | Relative ranking (quarterly, per title) — EM-only | Medium | Not started |
| 5 | 1-on-1 meeting notes with agenda templates | Large | DONE |
| 6 | Pre-1:1 email templates via Resend | Medium | Not started |
| 7 | Anonymous feedback (360 + upward) — URL-only for MVP | Medium-Large | Not started |
| 8 | Milestones linked to people | Small | Not started |
| 9 | GitHub API integration with analytics | Large | DONE |

### Completed (non-roadmap)

These significant efforts were completed outside the 9-feature roadmap:

- **Health Assessment Rewrite**: Replaced flat `StatusUpdate` model with rich `HealthAssessment` — per-dimension business metrics (Growth, Margin, Longevity, Client Satisfaction), vibe checks (Engineering, Product, Design), overall status, and rich text notes via TiptapEditor. Full-page form with accordion sections, color chip status picker, assessment detail/edit pages. See [health plan](../.claude/plans/abundant-dancing-flame.md).
- **Code Quality Audits**: Applied optimizations from Vercel React, Next.js, React, TS Best Practices, and TS Performance audits — `optimizePackageImports`, memoized table columns, minimal RSC serialization, Suspense boundaries, server component conversions, shared health status constants.

### Key Decisions
- **Member Profile Page**: A dedicated page at `/projects/[id]/team/member/[memberId]` will be created with Feature 3 and grow as features are added (notes, rankings, 1:1 history, feedback, milestones, GitHub stats).
- **Rankings**: EM-only — not visible to the people being ranked.
- **Feedback auth**: URL-only for MVP (anyone with the link can submit). Add email verification later if abuse becomes an issue.
- **Multi-team**: Start with multi-team within a project; cross-project people planned for a future phase.

### Implementation Deviations
Where the actual implementation differs from the original plan below:
- **Feature 2**: `managerId` lives on `Person` model (not `TeamMember`). Route is `/projects/[id]/org-chart/` (not `/org/`). Includes `ManagerChange` audit trail model.
- **Feature 5**: Routes live at `/me/one-on-ones/` and `/me/templates/` (global, not per-project). Uses Tiptap rich text for notes instead of plain textarea sections.
- **Feature 9**: Route is `/projects/[id]/stats/` (not `/github/`). Router is `github-stats.ts`.

---

## Feature 1: Multi-Team Membership — DONE

**Goal:** Allow a person to belong to multiple teams within a project. (Cross-project people planned for later.)

### Schema Changes (`packages/db/prisma/schema.prisma`)

Replace the direct `teamId` FK on `TeamMember` with an explicit join table:

```prisma
model TeamMembership {
  id           String     @id @default(cuid())
  teamId       String     @map("team_id")
  team         Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamMemberId String     @map("team_member_id")
  teamMember   TeamMember @relation(fields: [teamMemberId], references: [id], onDelete: Cascade)

  @@unique([teamId, teamMemberId])
  @@map("team_memberships")
}
```

- Remove `teamId` / `team` from `TeamMember`; add `teamMemberships TeamMembership[]`
- On `Team`: replace `members TeamMember[]` with `memberships TeamMembership[]`

### Migration Strategy

Two-step migration to avoid data loss:
1. Create `TeamMembership` table
2. Run a data migration script: for each `TeamMember` with a non-null `teamId`, insert a `TeamMembership` row
3. Drop the `teamId` column from `team_members`

### API Changes (`packages/api/src/routers/`)

- **team-member.ts**: Change create/update to accept `teamIds: string[]` instead of `teamId`. After creating/updating a member, sync `TeamMembership` rows (delete removed, create new).
- **team.ts**: Update `getByProjectId` to include `memberships: { include: { teamMember: true } }` with `_count`.
- **sync-arrangement.ts**: Update to query `TeamMembership` instead of `TeamMember.teamId`. Members on multiple teams appear in each team's arrangement group.

### UI Changes

- **team-member-sheet.tsx**: Replace single Team `<Select>` with multi-select (checkboxes or combobox). Accept/send `teamIds[]`.
- **team-section.tsx**: Update grouping logic — a member can appear under multiple team headings. Change `Map<string | null, ...>` to iterate memberships. "Unassigned" = members with zero memberships.
- **team-members-table.tsx**: Show team(s) as badges/chips instead of single team name.

### Validation (`apps/web/lib/validations/team-member.ts`)

Replace `teamId: z.string().optional()` with `teamIds: z.array(z.string()).optional()`.

### Key Files
- `packages/db/prisma/schema.prisma`
- `packages/api/src/routers/team-member.ts`
- `packages/api/src/routers/team.ts`
- `packages/api/src/lib/sync-arrangement.ts`
- `apps/web/components/team-member-sheet.tsx`
- `apps/web/components/team-section.tsx`
- `apps/web/components/team-members-table.tsx`
- `apps/web/lib/validations/team-member.ts`

---

## Feature 2: Reporting Structure + Org Chart — DONE

**Goal:** Add manager relationships and a visual org chart with expandable tree view.

**Deviation:** `managerId` is on `Person` model (not `TeamMember`). Route is `/org-chart/` not `/org/`. Includes `ManagerChange` model for audit trail.

### Schema Changes

Add self-referencing relation to `TeamMember`:

```prisma
model TeamMember {
  // ... existing fields ...
  managerId     String?      @map("manager_id")
  manager       TeamMember?  @relation("ManagerReports", fields: [managerId], references: [id], onDelete: SetNull)
  directReports TeamMember[] @relation("ManagerReports")
}
```

### API Changes

- **team-member.ts**: Add `managerId` to create/update schemas. Include `manager` and `directReports` in queries where needed.
- New query: `getOrgTree` — fetch all members for a project with manager/directReports/title/role included. Return flat list (client builds the tree).

### UI Changes

- **team-member-sheet.tsx**: Add "Reports To" `<Select>` dropdown listing all other members (filtered to exclude self and own reports to prevent cycles).
- **New route: `apps/web/app/projects/[id]/org-chart/page.tsx`** — Org chart page.
- **New component: `apps/web/components/org-chart.tsx`** — Recursive tree visualization using CSS flexbox/grid. Each node shows avatar, name, title. Click to expand/collapse.
- **project-sidebar.tsx**: Add "Org Chart" nav link (Network icon).

### Key Files
- `packages/db/prisma/schema.prisma`
- `packages/api/src/routers/team-member.ts`
- `apps/web/components/team-member-sheet.tsx`
- `apps/web/app/projects/[id]/org-chart/page.tsx`
- `apps/web/components/org-chart.tsx`
- `apps/web/components/project-sidebar.tsx`

---

## Feature 3: Free-Text Notes on People + Member Profile Page — NOT STARTED

**Goal:** Allow EMs to add timestamped notes about team members with full CRUD. Also introduce the **Member Profile Page** — a dedicated hub at `/projects/[id]/team/member/[memberId]` that aggregates all person-related data and grows with each subsequent feature.

### Schema Changes

```prisma
model MemberNote {
  id           String     @id @default(cuid())
  content      String
  authorId     String     @map("author_id")
  teamMemberId String     @map("team_member_id")
  teamMember   TeamMember @relation(fields: [teamMemberId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@map("member_notes")
}
```

Add `notes MemberNote[]` to `TeamMember`.

### API Changes

New router: `packages/api/src/routers/member-note.ts`
- `getByMemberId` — all notes for a member, ordered by `createdAt desc`
- `create` — requires `teamMemberId`, `content`; auto-sets `authorId` from ctx
- `update` — only if author matches ctx.userId
- `delete` — only if author matches ctx.userId

### UI Changes

- **New route: `apps/web/app/projects/[id]/team/member/[memberId]/page.tsx`** — Member Profile Page. Shows:
  - Header: avatar, name, title, role, team(s), manager, email
  - Notes section (primary content for now)
  - Future features add sections here: rankings (F4), 1:1 history (F5), feedback (F7), milestones (F8), GitHub stats (F9)
- **New component: `apps/web/components/member-notes.tsx`** — Timeline of notes with inline add/edit. Each note shows content, relative timestamp, edit/delete buttons for own notes.
- **team-members-table.tsx**: Make member names clickable → navigate to profile page.

### Key Files
- `packages/db/prisma/schema.prisma`
- `packages/api/src/routers/member-note.ts` (new)
- `packages/api/src/root.ts`
- `apps/web/app/projects/[id]/team/member/[memberId]/page.tsx` (new)
- `apps/web/components/member-profile.tsx` (new)
- `apps/web/components/member-notes.tsx` (new)
- `apps/web/lib/validations/member-note.ts` (new)

---

## Feature 4: Relative Ranking (Quarterly, Per Title) — NOT STARTED

**Goal:** Before each quarter end, EMs assign relative rankings to people within the same title/level. Rankings inform 1:1s and performance reviews. **Rankings are EM-only** — not visible to the people being ranked.

### Schema Changes

```prisma
model PerformanceRanking {
  id           String     @id @default(cuid())
  quarter      String                          // e.g. "2026-Q1"
  rank         Int                             // 1-based position within title group
  teamMemberId String     @map("team_member_id")
  teamMember   TeamMember @relation(fields: [teamMemberId], references: [id], onDelete: Cascade)
  titleId      String     @map("title_id")
  title        Title      @relation(fields: [titleId], references: [id])
  authorId     String     @map("author_id")
  notes        String?
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@unique([quarter, teamMemberId])
  @@map("performance_rankings")
}
```

Add `rankings PerformanceRanking[]` to both `TeamMember` and `Title`.

### API Changes

New router: `packages/api/src/routers/ranking.ts`
- `getByQuarter` — input: `{ projectId, quarter }`. Returns rankings grouped by title with member details.
- `saveRankings` — input: `{ projectId, quarter, rankings: { teamMemberId, rank, notes? }[] }`. Upserts all rankings for that quarter.
- `getQuarters` — list distinct quarters with rankings for a project.

### UI Changes

- **New route: `apps/web/app/projects/[id]/rankings/page.tsx`** — Rankings page.
- **New component: `apps/web/components/ranking-editor.tsx`** — Members grouped by title, drag-and-drop to reorder within each group. Optional notes field per member. Quarter selector. "Save Rankings" button.
- **project-sidebar.tsx**: Add "Rankings" nav link.

### Key Files
- `packages/db/prisma/schema.prisma`
- `packages/api/src/routers/ranking.ts` (new)
- `packages/api/src/root.ts`
- `apps/web/app/projects/[id]/rankings/page.tsx` (new)
- `apps/web/components/ranking-editor.tsx` (new)
- `apps/web/components/project-sidebar.tsx`

---

## Feature 5: 1-on-1 Meeting Notes with Agenda Templates — DONE

**Goal:** A CMS for 1:1 meetings. Each meeting is a dated entry with structured notes. Agenda templates provide starting structure.

**Deviation:** Routes live at `/me/one-on-ones/` and `/me/templates/` (global, not per-project). Uses Tiptap rich text for meeting notes instead of plain textarea sections.

### Schema Changes

```prisma
model MeetingTemplate {
  id          String    @id @default(cuid())
  name        String
  description String?
  sections    Json      // Array of { title: string, prompts: string[] }
  authorId    String    @map("author_id")
  createdAt   DateTime  @default(now()) @map("created_at")
  meetings    Meeting[]

  @@map("meeting_templates")
}

model Meeting {
  id           String           @id @default(cuid())
  date         DateTime
  teamMemberId String           @map("team_member_id")
  teamMember   TeamMember       @relation(fields: [teamMemberId], references: [id], onDelete: Cascade)
  templateId   String?          @map("template_id")
  template     MeetingTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  notes        Json             // Array of { sectionTitle: string, content: string }
  actionItems  Json?  @default("[]") // Array of { text: string, done: boolean }
  authorId     String           @map("author_id")
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")

  @@map("meetings")
}
```

Add `meetings Meeting[]` to `TeamMember`.

### API Changes

- **meeting-template.ts** (new): CRUD. Seed defaults: "Weekly Sync", "Career Growth", "Performance Check-in".
- **meeting.ts** (new): CRUD. `getByMemberId` (paginated, date desc), `getById`, `create`, `update`, `delete`.

### UI Changes

- **Actual routes: `apps/web/app/me/one-on-ones/`** — Overview, create, and detail pages.
- **`apps/web/app/me/templates/`** — Template management pages.
- **Meeting form** uses Tiptap rich text editor (dynamically imported, ssr: false).

### Key Files
- `packages/db/prisma/schema.prisma`
- `packages/api/src/routers/meeting-template.ts`
- `packages/api/src/routers/meeting.ts`
- `apps/web/app/me/one-on-ones/` (route group)
- `apps/web/app/me/templates/` (route group)
- `apps/web/components/meeting-form.tsx`

---

## Feature 6: Pre-1:1 Email Templates via Resend — NOT STARTED

**Goal:** Send prep emails to direct reports before scheduled 1:1s.

### Dependencies
- Resend API key (`RESEND_API_KEY` env var)
- Feature 5 (Meetings) implemented first — DONE

### Setup (adapted from wedding app pattern)

- `apps/web/lib/email/resend-client.ts` — `getResendClient()`, `sendEmail()` with test mode
- `apps/web/lib/email/templates/pre-one-on-one.tsx` — HTML template with meeting date, agenda, last meeting's action items
- `apps/web/lib/email/constants.ts` — Template aliases

### API/UI Changes

- Add `sendPreMeetingEmail` mutation to meeting router
- "Send Prep Email" button in the meeting editor UI

### Key Files
- `apps/web/lib/email/resend-client.ts` (new)
- `apps/web/lib/email/templates/pre-one-on-one.tsx` (new)
- `packages/api/src/routers/meeting.ts`

---

## Feature 7: Anonymous Feedback (360 + Upward) — NOT STARTED

**Goal:** Peers and direct reports submit anonymous feedback. EM sees all feedback for their reports. **MVP: URL-only auth** (knowing the link is enough to submit). Email verification can be added later if abuse becomes an issue.

### Schema Changes

```prisma
model Feedback {
  id        String       @id @default(cuid())
  content   String
  type      FeedbackType
  subjectId String       @map("subject_id")
  subject   TeamMember   @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  projectId String       @map("project_id")
  project   Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt DateTime     @default(now()) @map("created_at")
  // No authorId — anonymous by design

  @@map("feedback")
}

enum FeedbackType {
  PEER
  UPWARD
}
```

### API Changes

New router: `packages/api/src/routers/feedback.ts`
- `submit` — public (no author tracking). Input: `{ projectId, subjectId, content, type }`.
- `getByMemberId` — protected, returns all feedback for a member.
- `getByProjectId` — protected, all feedback grouped by subject.

### UI Changes

- **Public submission form**: `apps/web/app/feedback/[projectId]/page.tsx` — shareable link.
- **EM dashboard**: `apps/web/app/projects/[id]/feedback/page.tsx` — all feedback with type badges.
- **project-sidebar.tsx**: Add "Feedback" nav link.

---

## Feature 8: Milestones Linked to People — NOT STARTED

**Goal:** Associate existing milestones with team members driving them.

### Schema Changes

```prisma
model MilestoneAssignment {
  id           String     @id @default(cuid())
  milestoneId  String     @map("milestone_id")
  milestone    Milestone  @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  teamMemberId String     @map("team_member_id")
  teamMember   TeamMember @relation(fields: [teamMemberId], references: [id], onDelete: Cascade)
  role         String?    // "Owner", "Contributor"

  @@unique([milestoneId, teamMemberId])
  @@map("milestone_assignments")
}
```

### API/UI Changes

- **milestone.ts**: Accept `assigneeIds` in create/update. Include assignments in queries.
- **milestone-sheet.tsx**: Add multi-select for assignees.
- **milestones-table.tsx**: Show assignee avatars column.

### Key Files
- `packages/db/prisma/schema.prisma`
- `packages/api/src/routers/milestone.ts`
- `apps/web/components/milestone-sheet.tsx`
- `apps/web/components/milestones-table.tsx`

---

## Feature 9: GitHub API Integration with Analytics — DONE

**Goal:** Pull commit/PR/review data from GitHub API. Contributor analytics, charts, tier rankings.

**Deviation:** Route is `/projects/[id]/stats/` (not `/github/`). Router is `github-stats.ts`.

### Schema Changes

```prisma
model GitHubSync {
  id          String    @id @default(cuid())
  projectId   String    @unique @map("project_id")
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  githubToken String?   @map("github_token")
  lastSyncAt  DateTime? @map("last_sync_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@map("github_syncs")
}

model ContributorStats {
  id             String      @id @default(cuid())
  projectId      String      @map("project_id")
  project        Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  teamMemberId   String?     @map("team_member_id")
  teamMember     TeamMember? @relation(fields: [teamMemberId], references: [id], onDelete: SetNull)
  githubUsername  String      @map("github_username")
  period         String      // "2026-Q1", "2026-02"
  commits        Int         @default(0)
  prsOpened      Int         @default(0) @map("prs_opened")
  prsMerged      Int         @default(0) @map("prs_merged")
  reviewsDone    Int         @default(0) @map("reviews_done")
  linesAdded     Int         @default(0) @map("lines_added")
  linesRemoved   Int         @default(0) @map("lines_removed")
  createdAt      DateTime    @default(now()) @map("created_at")

  @@unique([projectId, githubUsername, period])
  @@map("contributor_stats")
}
```

### Tier Ranking (computed at query time)

Rank by activity score per period. Tiers: Top 10% "High Impact", 11-40% "Strong", 41-70% "Steady", 71-100% "Needs Attention". Configurable weight formula.

### API/UI Changes

- **github-stats.ts**: `getConfig`, `setupSync`, `triggerSync` (calls GitHub REST API), `getStats`, `getStatsByMember`.
- **Route: `apps/web/app/projects/[id]/stats/page.tsx`** — contributor charts, leaderboard table.
- **project-sidebar.tsx**: "Stats" nav link (BarChart3 icon).

---

## Verification (per feature)

1. `cd packages/db && bun run db:push`
2. `cd apps/web && bun run lint:fix && bun run lint:types`
3. `cd apps/web && SKIP_ENV_VALIDATION=1 bun run build`
4. Manual testing per feature

## Sidebar Navigation (current state)

Overview | Health | Team | Org Chart | Roadmap | Links | Arrangements | Stats

**Remaining (to be added):** Rankings (F4) | Feedback (F7)
