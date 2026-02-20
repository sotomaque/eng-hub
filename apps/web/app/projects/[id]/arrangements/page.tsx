import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Teams" };

import { ArrangementsList } from "@/components/arrangements-list";
import { getCachedProject } from "@/lib/trpc/cached-queries";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArrangementsPage({ params }: PageProps) {
  const { id } = await params;
  const trpc = await createServerCaller();

  const [project, initialArrangements, members] = await Promise.all([
    getCachedProject(id),
    trpc.arrangement.getByProjectId({ projectId: id }),
    trpc.teamMember.getByProjectId({ projectId: id }),
  ]);

  if (!project) notFound();

  // Auto-create an active arrangement from live teams if none exists
  let arrangements = initialArrangements;
  if (!arrangements.some((a) => a.isActive) && project.teams.length > 0) {
    await trpc.arrangement.ensureActiveArrangement({ projectId: id });
    arrangements = await trpc.arrangement.getByProjectId({ projectId: id });
  }

  return (
    <ArrangementsList
      projectId={id}
      projectName={project.name}
      arrangements={arrangements}
      totalMembers={members.length}
      hasLiveTeams={project.teams.length > 0}
    />
  );
}
