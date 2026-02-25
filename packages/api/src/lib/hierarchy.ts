import { db } from "@workspace/db";

const MAX_DEPTH = 50;

/**
 * Resolve a Clerk userId to a Person ID.
 */
export async function resolveClerkPerson(clerkUserId: string): Promise<string | null> {
  const viewer = await db.person.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  return viewer?.id ?? null;
}

/**
 * Build the full management chain (list of manager IDs) for a person.
 */
async function getManagementChain(personId: string): Promise<string[]> {
  const person = await db.person.findUnique({
    where: { id: personId },
    select: { managerId: true },
  });
  if (!person?.managerId) return [];

  const chain: string[] = [];
  let currentId: string | null = person.managerId;
  const visited = new Set<string>();
  let depth = 0;

  while (currentId && depth < MAX_DEPTH) {
    chain.push(currentId);
    if (visited.has(currentId)) break;
    visited.add(currentId);
    depth++;

    const row: { managerId: string | null } | null = await db.person.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    });
    currentId = row?.managerId ?? null;
  }

  return chain;
}

/**
 * Check if a Clerk userId is in the management chain above a given person.
 */
export async function isInManagementChain(clerkUserId: string, personId: string): Promise<boolean> {
  const viewerId = await resolveClerkPerson(clerkUserId);
  if (!viewerId) return false;

  const chain = await getManagementChain(personId);
  return chain.includes(viewerId);
}

/**
 * Check if a Clerk user can view meetings for a given person.
 * Access is granted if the user is in the management chain above the person,
 * OR if the person's direct manager has granted the user a visibility grant.
 */
export async function canViewMeetings(clerkUserId: string, personId: string): Promise<boolean> {
  const inChain = await isInManagementChain(clerkUserId, personId);
  if (inChain) return true;

  const viewerId = await resolveClerkPerson(clerkUserId);
  if (!viewerId) return false;

  const person = await db.person.findUnique({
    where: { id: personId },
    select: { managerId: true },
  });
  if (!person?.managerId) return false;

  const grant = await db.meetingVisibilityGrant.findUnique({
    where: {
      granterId_granteeId: {
        granterId: person.managerId,
        granteeId: viewerId,
      },
    },
    select: { id: true },
  });
  return grant !== null;
}
