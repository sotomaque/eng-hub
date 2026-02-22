import { db } from "@workspace/db";

const MAX_DEPTH = 50;

export async function detectMilestoneCycle(
  milestoneId: string,
  newParentId: string,
): Promise<boolean> {
  let currentId: string | null = newParentId;
  const visited = new Set<string>();
  let depth = 0;
  while (currentId && depth < MAX_DEPTH) {
    if (currentId === milestoneId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    depth++;
    const row: { parentId: string | null } | null =
      await db.milestone.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
    currentId = row?.parentId ?? null;
  }
  return false;
}

export async function detectGoalCycle(
  goalId: string,
  newParentId: string,
): Promise<boolean> {
  let currentId: string | null = newParentId;
  const visited = new Set<string>();
  let depth = 0;
  while (currentId && depth < MAX_DEPTH) {
    if (currentId === goalId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    depth++;
    const row: { parentId: string | null } | null =
      await db.quarterlyGoal.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
    currentId = row?.parentId ?? null;
  }
  return false;
}

export async function detectProjectCycle(
  projectId: string,
  newParentId: string,
): Promise<boolean> {
  let currentId: string | null = newParentId;
  const visited = new Set<string>();
  let depth = 0;
  while (currentId && depth < MAX_DEPTH) {
    if (currentId === projectId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    depth++;
    const row: { parentId: string | null } | null =
      await db.project.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
    currentId = row?.parentId ?? null;
  }
  return false;
}
