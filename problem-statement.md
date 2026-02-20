# Eng Hub

> A unified engineering management platform that replaces the patchwork of Figma boards, spreadsheets, personal docs, and manual repo spelunking with a single source of truth for project health, team composition, goal tracking, 1-on-1s, and delivery insights.

---

## TL;DR

Engineering leaders currently manage projects in Figma, 1-on-1s in Obsidian/Google Docs, goals in spreadsheets, and team structures in Rippling -- none of which talk to each other, none of which keep history, and none of which survive a manager handoff. Eng Hub consolidates all of it into one platform purpose-built for the way engineering organizations actually operate.

---

## The Problem

Engineering management is fragmented across a dozen tools, each owned by a different person with a different workflow. The result:

- **No historical context** -- project health is a point-in-time snapshot in a Figma board with no audit trail of how it got there.
- **No continuity** -- when an engineer changes managers, their 1-on-1 history, goals, and growth trajectory vanish.
- **No visibility** -- directors can't see their managers' 1-on-1 notes; managers can't see team composition across projects; nobody can see delivery trends without manually checking GitHub.
- **No standardization** -- every manager tracks goals, meetings, and status differently, making cross-team comparison impossible.
- **No centralization** -- project information (repos, Figma links, docs, FAQs, milestones, team roster) lives in five different places with no single URL to point people to.

---

## What Eng Hub Does Today

### Project Home Pages

Each project gets a dedicated hub that centralizes everything about it in one place:

- **Overview dashboard** with metric cards for health, team size, milestones, goals, and links
- **Curated link library** for Figma, Git repos, Millipedia pages, dashboards, and any external resource
- **Project description** and metadata (image, GitHub/GitLab URLs)
- One URL to share -- one place to look

### Multi-Dimensional Health Tracking

Project health assessments go beyond a single red/yellow/green dot:

- **8 scored dimensions** -- Overall, Growth, Margin, Longevity, Client Satisfaction, Engineering Vibe, Product Vibe, Design Vibe
- **Rich text notes** per dimension explaining _why_ the score is what it is
- **Full history** -- every assessment is timestamped with its author, creating a timeline of how health evolved
- **At-a-glance status** on the projects list page so leadership can spot trouble instantly

### 1-on-1 Meeting Notes

Standardized meeting tracking with built-in continuity:

- **Rich text editor** (Tiptap) for detailed, formatted meeting notes
- **Reusable templates** so managers can standardize their 1-on-1 structure across all reports
- **Organized by direct report** -- one view shows all meetings with a given person
- **Manager chain visibility** -- managers up the chain can see their reports' 1-on-1s, enabling directors to stay informed without micromanaging
- **Handoff continuity** -- when an engineer moves to a new manager, the full 1-on-1 history follows them via the management chain, giving the new manager immediate context on past conversations, concerns, and goals

### Hierarchical Goal Management

Milestones and quarterly goals with real structure:

- **Milestones** for major deliverables with target dates and status tracking (Not Started, In Progress, Completed, At Risk)
- **Quarterly Goals** for OKR-style planning with the same status and assignment model
- **Nested hierarchy** -- parent milestones/goals can have children, modeling epics and sub-tasks naturally
- **Key Results** (up to 5 per item) with current/target values and units for measurable outcomes
- **Assignees** -- tag team members to milestones and goals so ownership is explicit
- **Roadmap view** combining milestones and goals in a single project page

### Team Composition & Arrangements

Visibility into how teams are actually structured -- not just who reports to whom:

- **Team creation** within projects with member assignment
- **Seniority visualization** via title-colored composition bars -- instantly see "Team X is all seniors while Team Y has none"
- **Department breakdown** showing cross-functional distribution
- **Arrangement editor** -- draft multiple team configurations side-by-side before committing
  - Drag-and-drop visual editor for moving members between teams
  - Table view alternative for quick bulk edits
  - Unassigned member pool with search by name, department, or title
  - One arrangement marked "live" at a time; others serve as proposals
- **Org chart** showing the reporting hierarchy within a project, including external managers managing team members from outside the project

### Delivery Insights (GitHub Integration)

Automated contributor analytics that replace manual repo checking:

- **Commit stats** -- total commits, additions, deletions per contributor
- **PR metrics** -- PRs opened, merged, and review activity
- **Trend analysis** -- weekly averages with up/down/stable indicators comparing recent activity to historical
- **All-time vs. YTD** toggle for different time horizons
- **Visual dashboards** -- bar charts, pie charts, and sortable data tables
- **Insights engine** surfacing trending-up contributors, those needing attention, and top reviewers
- **Automated sync** with manual trigger option and sync status tracking

### People Directory & Profiles

A central directory for the engineering organization:

- **Searchable, paginated people table** with filters by project, department, and title
- **Person profiles** showing projects, teams, manager, direct reports, roadmap assignments, and external identifiers (GitHub/GitLab)
- **Person comments** -- leave notes on a person's profile (visible to authenticated users)
- **"This is me" linking** -- engineers claim their profile by connecting their Clerk auth to a person record
- **Manager change audit trail** -- every reporting change is logged with old manager, new manager, timestamp, and who made the change

### Department & Title Taxonomy

Centralized organizational structure management:

- **Departments and titles** managed globally with full CRUD
- **Title-to-department mapping** for organizational grouping
- **Sort ordering** for consistent display hierarchy
- **Merge capability** for org restructuring (combine two departments/titles into one)
- **Color-coded title badges** used consistently across team views, composition bars, and arrangement editors

---

## Future Features

### Cross-Project Funding Visibility
Mark which projects fund other projects, mapping financial dependencies across the portfolio. Today a manager sees their projects in isolation -- they can't tell that three "healthy" projects all depend on one struggling program.

### Cascading Risk Detection
Surface hidden risks automatically. If Project A is in bad health and Projects B, C, D, and E are all funded by it, flag that dependency so leadership can act before downstream projects are affected.

### Contributor Stats on Person Profiles
Show an individual's GitHub/GitLab delivery metrics directly on their person page alongside team assignments, goals, and 1-on-1 history -- giving managers a complete picture of the engineer in one view.

### Comparative Performance Analysis
Tools for performance review cycles that enable data-informed decisions. Instead of just asking "is Engineer X doing well?", managers can compare engineers at the same level across delivery dimensions -- commits, reviews, goal completion, trend trajectory -- to support promotion cases, identify high performers, or spot engineers who need support.

### Anonymous Engineer Feedback
A safe, anonymous channel for engineers to submit feedback about projects, processes, or management. Surface themes and trends without exposing individual identities.

### Roles & Permissions
Granular access control reflecting how different stakeholders use the platform:

- **Engineers** see their assigned projects, team details, FAQs, links, and SMEs -- but not health assessments or management-layer data
- **Product managers** access milestones and goals they're assigned to without full engineering management visibility
- **Engineering managers** see everything for their projects and reports
- **Directors/VPs** get portfolio-wide visibility

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| UI Components | shadcn/ui (Radix UI), Lucide icons, Tiptap rich text editor |
| API | tRPC v11 with Zod validation |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Cache | Upstash Redis (REST) with TTL-based invalidation |
| Auth | Clerk with management chain-based visibility |
| Rate Limiting | Upstash Ratelimit (100 reads/min, 30 writes/min) |
| Integrations | GitHub REST + GraphQL APIs |
| Monorepo | Turborepo with Bun package manager |
| Quality | Biome linting, Knip dead code detection, Playwright E2E |
