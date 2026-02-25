import { Button } from "@workspace/ui/components/button";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  FolderKanban,
  GitBranch,
  LayoutGrid,
  Target,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = { title: "Home" };

const highlights = [
  {
    icon: FolderKanban,
    title: "Projects",
    description:
      "Centralized hubs with health tracking, team rosters, milestones, and curated links.",
  },
  {
    icon: Users,
    title: "People",
    description: "Searchable directory with profiles, org charts, and manager change audit trails.",
  },
  {
    icon: Target,
    title: "Goals",
    description: "Hierarchical milestones, quarterly OKRs, key results, and assignee tracking.",
  },
];

const capabilities = [
  {
    icon: Activity,
    label: "Health Tracking",
    detail: "8-dimension assessments with full history",
  },
  {
    icon: CalendarCheck,
    label: "1:1 Notes",
    detail: "Structured notes that survive manager handoffs",
  },
  {
    icon: LayoutGrid,
    label: "Team Arrangements",
    detail: "Drag-and-drop team planning with draft proposals",
  },
  {
    icon: GitBranch,
    label: "Delivery Insights",
    detail: "Automated GitHub analytics and trend analysis",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="from-primary/5 via-accent/5 pointer-events-none absolute inset-0 to-transparent bg-gradient-to-b" />
        <div className="relative mx-auto max-w-4xl px-4 pt-24 pb-20 text-center sm:px-6 sm:pt-32 sm:pb-28 lg:px-8">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Engineering,
            <br />
            <span className="text-primary">organized.</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed sm:text-xl">
            One place for projects, people, goals, and 1:1s. Replace the patchwork of tools with a
            single source of truth.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 rounded-full px-8">
              <Link href="/projects">
                Get Started
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="text-muted-foreground h-12 rounded-full px-8"
            >
              <Link href="/faq">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-transparent bg-card p-8 shadow-sm transition-all hover:border-border hover:shadow-md"
            >
              <div className="text-primary mb-5">
                <item.icon className="size-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-primary text-sm font-medium tracking-wide uppercase">
              Built for engineering leaders
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your org needs
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-base">
              From health assessments to delivery analytics, Eng Hub covers the full surface area of
              engineering management.
            </p>
          </div>

          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
            {capabilities.map((cap) => (
              <div key={cap.label} className="bg-card flex items-start gap-4 p-8">
                <div className="bg-primary/10 text-primary shrink-0 rounded-xl p-2.5">
                  <cap.icon className="size-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">{cap.label}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{cap.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to consolidate your tooling?
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-md text-base">
            Stop context-switching between Figma, spreadsheets, and GitHub. Start managing
            everything in one place.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="h-12 rounded-full px-8">
              <Link href="/projects">
                View Projects
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
