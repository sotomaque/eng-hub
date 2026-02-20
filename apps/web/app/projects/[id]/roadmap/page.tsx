import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MilestoneSheet } from "@/components/milestone-sheet";
import { QuarterlyGoalSheet } from "@/components/quarterly-goal-sheet";
import { RoadmapSection } from "@/components/roadmap-section";
import { getCachedProject } from "@/lib/trpc/cached-queries";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    addMilestone?: string;
    editMilestone?: string;
    addGoal?: string;
    editGoal?: string;
  }>;
}

function serializeDate(d: Date | null): string | null {
  return d?.toISOString() ?? null;
}

async function RoadmapContent({ id }: { id: string }) {
  const project = await getCachedProject(id);
  if (!project) notFound();

  const milestones = project.milestones.map((m) => ({
    ...m,
    targetDate: serializeDate(m.targetDate),
    children: m.children.map((c) => ({
      ...c,
      targetDate: serializeDate(c.targetDate),
    })),
  }));

  const quarterlyGoals = project.quarterlyGoals.map((g) => ({
    ...g,
    targetDate: serializeDate(g.targetDate),
    children: g.children.map((c) => ({
      ...c,
      targetDate: serializeDate(c.targetDate),
    })),
  }));

  return (
    <RoadmapSection
      projectId={id}
      milestones={milestones}
      quarterlyGoals={quarterlyGoals}
    />
  );
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
  return (
    <MilestoneSheet
      projectId={projectId}
      milestone={{
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        targetDate: milestone.targetDate?.toISOString() ?? null,
        status: milestone.status,
        parentId: milestone.parentId,
        assignments: milestone.assignments,
        keyResults: milestone.keyResults,
      }}
    />
  );
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
  return (
    <QuarterlyGoalSheet
      projectId={projectId}
      goal={{
        id: goal.id,
        title: goal.title,
        description: goal.description,
        quarter: goal.quarter,
        targetDate: goal.targetDate?.toISOString() ?? null,
        status: goal.status,
        parentId: goal.parentId,
        assignments: goal.assignments,
        keyResults: goal.keyResults,
      }}
    />
  );
}

export default async function RoadmapPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <>
      <Suspense fallback={null}>
        <RoadmapContent id={id} />
      </Suspense>

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
    </>
  );
}
