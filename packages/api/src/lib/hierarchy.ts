import { db } from "@workspace/db";
import { cacheKeys, ttl } from "./cache";
import { redis } from "./redis";

const MAX_DEPTH = 50;

/**
 * Resolve a Clerk userId to a Person ID, with caching.
 */
async function resolveClerkPerson(clerkUserId: string): Promise<string | null> {
  const cached = await redis.get<string>(cacheKeys.clerkPerson(clerkUserId));
  if (cached) return cached;

  const viewer = await db.person.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  if (!viewer) return null;

  await redis.set(cacheKeys.clerkPerson(clerkUserId), viewer.id, {
    ex: ttl.clerkPerson,
  });
  return viewer.id;
}

/**
 * Build and cache the full management chain (set of manager IDs) for a person.
 */
async function getManagementChain(personId: string): Promise<string[]> {
  const key = cacheKeys.mgmtChain(personId);
  const keyExists = await redis.exists(key);
  if (keyExists === 1) {
    return redis.smembers(key);
  }

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

    const row: { managerId: string | null } | null = await db.person.findUnique(
      {
        where: { id: currentId },
        select: { managerId: true },
      },
    );
    currentId = row?.managerId ?? null;
  }

  if (chain.length > 0) {
    for (const memberId of chain) {
      await redis.sadd(key, memberId);
    }
    await redis.expire(key, ttl.mgmtChain);
  }

  return chain;
}

/**
 * Check if a Clerk userId is in the management chain above a given person.
 * Uses cached chain (Redis Set) for O(1) lookups after first build.
 */
export async function isInManagementChain(
  clerkUserId: string,
  personId: string,
): Promise<boolean> {
  const viewerId = await resolveClerkPerson(clerkUserId);
  if (!viewerId) return false;

  const key = cacheKeys.mgmtChain(personId);
  const keyExists = await redis.exists(key);
  if (keyExists === 1) {
    const isMember = await redis.sismember(key, viewerId);
    return isMember === 1;
  }

  const chain = await getManagementChain(personId);
  return chain.includes(viewerId);
}
