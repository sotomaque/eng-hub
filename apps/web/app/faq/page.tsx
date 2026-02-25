import {
  Activity,
  CalendarCheck,
  FolderKanban,
  GitBranch,
  LayoutGrid,
  Target,
  Users,
} from "lucide-react";
import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = { title: "FAQ" };

const features = [
  {
    icon: FolderKanban,
    title: "Project Home Pages",
    description:
      "Every project gets a single URL that centralizes its description, team roster, health status, milestones, goals, and links to external tools like Figma, Git repos, and Millipedia.",
    items: [
      "Overview dashboard with metric cards for health, team size, milestones, goals, and links",
      "Curated link library for Figma, Git repos, Millipedia, dashboards, and any external resource",
      "Project description and metadata with image and repository URLs",
    ],
  },
  {
    icon: Activity,
    title: "Multi-Dimensional Health Tracking",
    description:
      "Go beyond a single red/yellow/green dot. Track project health across 8 dimensions with rich notes explaining the why behind each score, and see how health has evolved over time.",
    items: [
      "8 scored dimensions: Overall, Growth, Margin, Longevity, Client Satisfaction, Engineering Vibe, Product Vibe, Design Vibe",
      "Rich text notes per dimension explaining the reasoning behind each score",
      "Full assessment history with author and timestamp for every change",
      "At-a-glance status indicators on the projects list page",
    ],
  },
  {
    icon: CalendarCheck,
    title: "1:1 Meeting Notes",
    description:
      "Standardized meeting tracking that survives manager handoffs. Notes are organized by direct report, supported by reusable templates, and visible up the management chain.",
    items: [
      "Rich text editor for detailed, formatted meeting notes",
      "Reusable templates so managers can standardize their 1:1 structure",
      "Organized by direct report with a single view for all meetings with a given person",
      "Manager chain visibility so directors can stay informed without micromanaging",
      "Handoff continuity: when an engineer changes managers, the full 1:1 history follows them",
    ],
  },
  {
    icon: Target,
    title: "Goal Management & Roadmap",
    description:
      "Milestones and quarterly goals with real structure. Nested hierarchies, key results, assignees, and risk indicators -- all tied to projects and people.",
    items: [
      "Milestones for major deliverables with target dates and status tracking",
      "Quarterly goals for OKR-style planning with the same status and assignment model",
      "Nested parent-child hierarchy for modeling epics and sub-tasks",
      "Key results (up to 5 per item) with current/target values and units",
      "Assignees linked to team members so ownership is explicit",
    ],
  },
  {
    icon: LayoutGrid,
    title: "Team Composition & Arrangements",
    description:
      "See how teams are actually structured -- not just who reports to whom. Visualize seniority distribution, plan reorgs with draft arrangements, and use drag-and-drop to move members between teams.",
    items: [
      "Team creation within projects with member assignment across multiple teams",
      "Seniority visualization via title-colored composition bars",
      "Drag-and-drop arrangement editor for drafting team configurations before committing",
      "Multiple arrangements: one live, others as proposals for review",
      "Org chart showing reporting hierarchy within a project",
    ],
  },
  {
    icon: GitBranch,
    title: "Delivery Insights",
    description:
      "Automated contributor analytics that replace manual repo checking. See commit stats, PR metrics, review activity, and trend analysis per project.",
    items: [
      "Commits, additions, deletions, PRs opened/merged, and reviews per contributor",
      "Trend analysis with up/down/stable indicators comparing recent to historical",
      "All-time vs year-to-date toggle for different time horizons",
      "Visual dashboards with bar charts, pie charts, and sortable data tables",
      "Insights engine surfacing trending contributors, those needing attention, and top reviewers",
    ],
  },
  {
    icon: Users,
    title: "People Directory & Profiles",
    description:
      "A central directory for the engineering organization with searchable profiles, manager hierarchies, and an audit trail of every reporting change.",
    items: [
      "Searchable, paginated people table with filters by project, department, and title",
      "Person profiles showing projects, teams, manager, direct reports, and roadmap assignments",
      "Manager change audit trail logging every reporting change with timestamps",
      "Department and title management with merge capability for org restructuring",
      "Interactive org chart visualization for the full organization",
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="from-primary/5 via-accent/5 pointer-events-none absolute inset-0 to-transparent bg-gradient-to-b" />
        <div className="relative mx-auto max-w-3xl px-4 pt-24 pb-16 text-center sm:px-6 sm:pt-32 sm:pb-20 lg:px-8">
          <p className="text-primary text-sm font-medium tracking-wide uppercase">Features</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            What can Eng Hub do?
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed">
            A unified engineering management platform that replaces Figma boards, spreadsheets,
            personal docs, and manual repo spelunking with a single source of truth.
          </p>
        </div>
      </section>

      {/* Features */}
      <main className="mx-auto max-w-4xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {features.map((feature) => (
            <section
              key={feature.title}
              className="group rounded-2xl border border-transparent bg-card p-8 shadow-sm transition-all hover:border-border hover:shadow-md sm:p-10"
            >
              <div className="flex items-start gap-5">
                <div className="bg-primary/10 text-primary shrink-0 rounded-xl p-2.5">
                  <feature.icon className="size-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight">{feature.title}</h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="text-muted-foreground mt-5 space-y-2.5 text-sm leading-relaxed">
                    {feature.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="text-primary mt-1.5 block size-1.5 shrink-0 rounded-full bg-current" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
