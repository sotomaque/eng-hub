import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectDetailSkeleton } from "@/components/project-detail-skeleton";
import { ProjectOverview } from "@/components/project-overview";
import { getCachedProject } from "@/lib/trpc/cached-queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function OverviewContent({ id }: { id: string }) {
  const project = await getCachedProject(id);
  if (!project) notFound();

  return (
    <ProjectOverview
      projectId={id}
      description={project.description}
      latestStatus={project.statusUpdates[0] ?? null}
      teamMembers={project.teamMembers}
      teams={project.teams}
      milestones={project.milestones}
      quarterlyGoals={project.quarterlyGoals}
      links={project.links}
      githubUrl={project.githubUrl}
      gitlabUrl={project.gitlabUrl}
    />
  );
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <OverviewContent id={id} />
    </Suspense>
  );
}
