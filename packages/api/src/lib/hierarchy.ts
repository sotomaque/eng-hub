import { db } from "@workspace/db";

const MAX_DEPTH = 50;

/**
 * Check if a Clerk userId is in the management chain above a given person.
 * Walks up from the person's manager until it finds the viewer or exhausts the chain.
 */
export async function isInManagementChain(
  clerkUserId: string,
  personId: string,
): Promise<boolean> {
  const [viewer, person] = await Promise.all([
    db.person.findUnique({ where: { clerkUserId }, select: { id: true } }),
    db.person.findUnique({
      where: { id: personId },
      select: { managerId: true },
    }),
  ]);
  if (!viewer || !person) return false;

  let currentId: string | null = person.managerId;
  const visited = new Set<string>();
  let depth = 0;

  while (currentId && depth < MAX_DEPTH) {
    if (currentId === viewer.id) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    depth++;

    const row = await db.person.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    });
    currentId = row?.managerId ?? null;
  }

  return false;
}
