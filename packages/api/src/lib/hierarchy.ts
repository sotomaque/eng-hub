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
