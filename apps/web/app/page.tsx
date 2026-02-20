import { Button } from "@workspace/ui/components/button";
import { FolderKanban, HelpCircle, Target, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = { title: "Home" };

const highlights = [
  {
    icon: FolderKanban,
    title: "Project Management",
    description:
      "Track health, milestones, and team composition across all your projects.",
  },
  {
    icon: Users,
    title: "People & Org",
    description:
      "Directory, org chart, departments, and title management in one place.",
  },
  {
    icon: Target,
    title: "Goals & Roadmaps",
    description:
      "Quarterly goals, key results, and milestone tracking to keep teams aligned.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Engineering, organized.
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
            Eng Hub gives your engineering org a single place to manage
            projects, people, goals, and 1:1s — so you can focus on building.
          </p>

          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link href="/projects">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/faq">
                <HelpCircle className="size-4" />
                Learn More
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-8 sm:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center rounded-lg border p-6 text-center"
            >
              <div className="bg-primary/10 text-primary mb-4 rounded-full p-3">
                <item.icon className="size-6" />
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {item.description}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
