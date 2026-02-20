import { CalendarCheck, FolderKanban, Target, Users } from "lucide-react";
import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = { title: "FAQ" };

const features = [
  {
    icon: Users,
    title: "People Management",
    items: [
      "Company-wide people directory with search and filtering",
      "Interactive org chart visualization",
      "Department and title management with custom sort ordering",
      "Manager hierarchy tracking and direct reports",
    ],
  },
  {
    icon: FolderKanban,
    title: "Project Management",
    items: [
      "Project health assessments (RED / YELLOW / GREEN) across multiple dimensions",
      "Team composition with role-based member management",
      "GitHub integration for contributor stats, commit trends, and PR tracking",
      "Project links to external tools like Figma, Confluence, and Jira",
    ],
  },
  {
    icon: CalendarCheck,
    title: "1:1 Record Keeping",
    items: [
      "Meeting notes for every 1:1 with your direct reports",
      "Reusable meeting templates for consistent agendas",
      "Personal dashboard to manage all your 1:1 relationships",
    ],
  },
  {
    icon: Target,
    title: "Goal Management & Roadmap Planning",
    items: [
      "Quarterly goals with drag-and-drop prioritization",
      "Project milestones organized into a visual roadmap",
      "Key results linked to milestones and goals for tracking progress",
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What can Eng Hub do?
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Everything your engineering org needs in one place.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {features.map((feature) => (
            <section key={feature.title} className="rounded-lg border p-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary rounded-full p-2">
                  <feature.icon className="size-5" />
                </div>
                <h2 className="text-xl font-semibold">{feature.title}</h2>
              </div>
              <ul className="text-muted-foreground mt-4 space-y-2 pl-12 text-sm">
                {feature.items.map((item) => (
                  <li key={item} className="list-disc">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
