import { db } from "@workspace/db";

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
 * Uses a recursive CTE to fetch the entire chain in a single query.
 */
async function getManagementChain(personId: string): Promise<string[]> {
  const chain = await db.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE chain AS (
      SELECT manager_id AS id
      FROM people
      WHERE id = ${personId} AND manager_id IS NOT NULL
      UNION ALL
      SELECT p.manager_id
      FROM people p
      JOIN chain c ON p.id = c.id
      WHERE p.manager_id IS NOT NULL
    )
    SELECT id FROM chain
    LIMIT 50
  `;
  return chain.map((r) => r.id);
}

/**
 * Check if a Clerk user is the direct manager of a given person.
 */
export async function isDirectManager(clerkUserId: string, personId: string): Promise<boolean> {
  const managerId = await resolveClerkPerson(clerkUserId);
  if (!managerId) return false;
  const person = await db.person.findUnique({
    where: { id: personId },
    select: { managerId: true },
  });
  return person?.managerId === managerId;
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
