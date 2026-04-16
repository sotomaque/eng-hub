import { db } from "@workspace/db";

/**
 * Resolve an external auth provider userId to a Person ID.
 */
export async function resolveAuthPerson(externalUserId: string): Promise<string | null> {
  const viewer = await db.person.findUnique({
    where: { clerkUserId: externalUserId },
    select: { id: true },
  });
  return viewer?.id ?? null;
}

/**
 * Build the full management chain (list of manager IDs) above a person.
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
 * Check if externalUserId is anywhere in the management chain above targetPersonId.
 */
export async function isInManagementChain(
  externalUserId: string,
  targetPersonId: string,
): Promise<boolean> {
  const viewerId = await resolveAuthPerson(externalUserId);
  if (!viewerId) return false;
  const chain = await getManagementChain(targetPersonId);
  return chain.includes(viewerId);
}

/**
 * Check if externalUserId is the direct manager of personId.
 */
export async function isDirectManager(externalUserId: string, personId: string): Promise<boolean> {
  const viewerId = await resolveAuthPerson(externalUserId);
  if (!viewerId) return false;
  const person = await db.person.findUnique({
    where: { id: personId },
    select: { managerId: true },
  });
  if (!person?.managerId) return false;
  return person.managerId === viewerId;
}

/**
 * Check if externalUserId can view meetings for personId.
 * True if viewer is anywhere in the management chain above personId.
 */
export async function canViewMeetings(externalUserId: string, personId: string): Promise<boolean> {
  return isInManagementChain(externalUserId, personId);
}
