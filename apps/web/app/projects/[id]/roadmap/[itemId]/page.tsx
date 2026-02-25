import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MilestoneSheet } from "@/components/milestone-sheet";
import { QuarterlyGoalSheet } from "@/components/quarterly-goal-sheet";
import { RoadmapItemDetail } from "@/components/roadmap-item-detail";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string; itemId: string }>;
  searchParams: Promise<{
    addMilestone?: string;
    editMilestone?: string;
    addGoal?: string;
    editGoal?: string;
  }>;
};

function serializeDate(d: Date | string | null): string | null {
  if (!d) return null;
  return typeof d === "string" ? d : d.toISOString();
}

async function resolveItem(itemId: string) {
  const trpc = await createServerCaller();

  const milestone = await trpc.milestone.getById({ id: itemId });
  if (milestone) {
    return { type: "milestone" as const, item: milestone };
  }

  const goal = await trpc.quarterlyGoal.getById({ id: itemId });
  if (goal) {
    return { type: "quarterlyGoal" as const, item: goal };
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { itemId } = await params;
  const resolved = await resolveItem(itemId);
  return { title: resolved?.item.title ?? "Not Found" };
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
        targetDate: serializeDate(milestone.targetDate),
        status: milestone.status,
        parentId: milestone.parentId,
        assignments: milestone.assignments,
        keyResults: milestone.keyResults,
      }}
    />
  );
}

async function EditGoalContent({ projectId, goalId }: { projectId: string; goalId: string }) {
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
        targetDate: serializeDate(goal.targetDate),
        status: goal.status,
        parentId: goal.parentId,
        assignments: goal.assignments,
        keyResults: goal.keyResults,
      }}
    />
  );
}

export default async function RoadmapItemPage({ params, searchParams }: PageProps) {
  const { id, itemId } = await params;
  const sp = await searchParams;

  const resolved = await resolveItem(itemId);
  if (!resolved) notFound();

  const { type, item } = resolved;

  const serializedItem = {
    id: item.id,
    title: item.title,
    description: item.description,
    targetDate: serializeDate(item.targetDate),
    status: item.status,
    parentId: item.parentId,
    parent: item.parent,
    quarter:
      type === "quarterlyGoal"
        ? (item as typeof resolved.item & { quarter: string | null }).quarter
        : null,
    assignments: item.assignments,
    keyResults: item.keyResults.map((kr) => ({
      id: kr.id,
      title: kr.title,
      targetValue: kr.targetValue,
      currentValue: kr.currentValue,
      unit: kr.unit,
      status: kr.status,
      sortOrder: kr.sortOrder,
    })),
    children: item.children.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      targetDate: serializeDate(c.targetDate),
      status: c.status,
      sortOrder: c.sortOrder,
      assignments: c.assignments,
      keyResults: c.keyResults,
      quarter:
        type === "quarterlyGoal" ? (c as typeof c & { quarter: string | null }).quarter : null,
    })),
  };

  return (
    <>
      <RoadmapItemDetail projectId={id} type={type} item={serializedItem} />

      {sp.addMilestone === "true" && <MilestoneSheet projectId={id} defaultParentId={itemId} />}
      {sp.editMilestone && (
        <Suspense fallback={null}>
          <EditMilestoneContent projectId={id} milestoneId={sp.editMilestone} />
        </Suspense>
      )}

      {sp.addGoal === "true" && <QuarterlyGoalSheet projectId={id} defaultParentId={itemId} />}
      {sp.editGoal && (
        <Suspense fallback={null}>
          <EditGoalContent projectId={id} goalId={sp.editGoal} />
        </Suspense>
      )}
    </>
  );
}
