import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { HealthSection } from "@/components/health-section";
import { LinksSection } from "@/components/links-section";
import { MilestoneSheet } from "@/components/milestone-sheet";
import { ProjectDetailSkeleton } from "@/components/project-detail-skeleton";
import { ProjectHeader } from "@/components/project-header";
import { ProjectLinkSheet } from "@/components/project-link-sheet";
import { QuarterlyGoalSheet } from "@/components/quarterly-goal-sheet";
import { RoadmapSection } from "@/components/roadmap-section";
import { StatusUpdateSheet } from "@/components/status-update-sheet";
import { TeamMemberSheet } from "@/components/team-member-sheet";
import { TeamSection } from "@/components/team-section";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    addStatus?: string;
    addMember?: string;
    editMember?: string;
    addMilestone?: string;
    editMilestone?: string;
    addGoal?: string;
    editGoal?: string;
    addLink?: string;
    editLink?: string;
  }>;
}

async function ProjectDetailContent({ id }: { id: string }) {
  const trpc = await createServerCaller();
  const project = await trpc.project.getById({ id });
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <ProjectHeader
        name={project.name}
        description={project.description}
        latestStatus={project.statusUpdates[0] ?? null}
      />
      <HealthSection projectId={id} statusUpdates={project.statusUpdates} />
      <TeamSection projectId={id} members={project.teamMembers} />
      <RoadmapSection
        projectId={id}
        milestones={project.milestones}
        quarterlyGoals={project.quarterlyGoals}
      />
      <LinksSection
        projectId={id}
        links={project.links}
        githubUrl={project.githubUrl}
        gitlabUrl={project.gitlabUrl}
      />
    </div>
  );
}

async function EditTeamMemberContent({
  projectId,
  memberId,
}: {
  projectId: string;
  memberId: string;
}) {
  const trpc = await createServerCaller();
  const member = await trpc.teamMember.getById({ id: memberId });
  if (!member) return null;
  return <TeamMemberSheet projectId={projectId} member={member} />;
}

async function EditMilestoneContent({
  projectId,
  milestoneId,
}: {
  projectId: string;
  milestoneId: string;
}) {
  const trpc = await createServerCaller();
  const milestone = await trpc.milestone.getById({ id: milestoneId });
  if (!milestone) return null;
  return <MilestoneSheet projectId={projectId} milestone={milestone} />;
}

async function EditGoalContent({
  projectId,
  goalId,
}: {
  projectId: string;
  goalId: string;
}) {
  const trpc = await createServerCaller();
  const goal = await trpc.quarterlyGoal.getById({ id: goalId });
  if (!goal) return null;
  return <QuarterlyGoalSheet projectId={projectId} goal={goal} />;
}

async function EditLinkContent({
  projectId,
  linkId,
}: {
  projectId: string;
  linkId: string;
}) {
  const trpc = await createServerCaller();
  const link = await trpc.projectLink.getById({ id: linkId });
  if (!link) return null;
  return <ProjectLinkSheet projectId={projectId} link={link} />;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<ProjectDetailSkeleton />}>
          <ProjectDetailContent id={id} />
        </Suspense>
      </main>

      {sp.addStatus === "true" && <StatusUpdateSheet projectId={id} />}

      {sp.addMember === "true" && <TeamMemberSheet projectId={id} />}
      {sp.editMember && (
        <Suspense fallback={null}>
          <EditTeamMemberContent projectId={id} memberId={sp.editMember} />
        </Suspense>
      )}

      {sp.addMilestone === "true" && <MilestoneSheet projectId={id} />}
      {sp.editMilestone && (
        <Suspense fallback={null}>
          <EditMilestoneContent projectId={id} milestoneId={sp.editMilestone} />
        </Suspense>
      )}

      {sp.addGoal === "true" && <QuarterlyGoalSheet projectId={id} />}
      {sp.editGoal && (
        <Suspense fallback={null}>
          <EditGoalContent projectId={id} goalId={sp.editGoal} />
        </Suspense>
      )}

      {sp.addLink === "true" && <ProjectLinkSheet projectId={id} />}
      {sp.editLink && (
        <Suspense fallback={null}>
          <EditLinkContent projectId={id} linkId={sp.editLink} />
        </Suspense>
      )}
    </div>
  );
}
