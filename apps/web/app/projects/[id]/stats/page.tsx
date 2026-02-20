import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Stats" };

import { Suspense } from "react";
import { StatsSection } from "@/components/stats/stats-section";
import { getCachedProject } from "@/lib/trpc/cached-queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function StatsContent({ id }: { id: string }) {
  const project = await getCachedProject(id);
  if (!project) notFound();

  if (!project.githubUrl && !project.gitlabUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <AlertCircle className="text-muted-foreground size-10" />
        <h2 className="text-lg font-semibold">No Repository Configured</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Add a GitHub or GitLab URL to this project&apos;s settings to see
          contributor stats and analytics.
        </p>
      </div>
    );
  }

  return <StatsSection projectId={id} hasGithubUrl={!!project.githubUrl} />;
}

export default async function StatsPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <StatsContent id={id} />
    </Suspense>
  );
}
