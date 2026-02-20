import { redis } from "./redis";

// ── Key Builders ──────────────────────────────────────────────

export const cacheKeys = {
  departments: "enghub:departments:all",
  titles: "enghub:titles:all",
  project: (id: string) => `enghub:project:${id}`,
  projectList: "enghub:projects:list",
  people: "enghub:people:all",
  personMe: (clerkUserId: string) => `enghub:person-me:${clerkUserId}`,
  clerkPerson: (clerkUserId: string) => `enghub:clerk-person:${clerkUserId}`,
  mgmtChain: (personId: string) => `enghub:mgmt-chain:${personId}`,
  githubStats: (projectId: string) => `enghub:github-stats:${projectId}`,
  meetingTemplates: "enghub:meeting-templates:all",
} as const;

// ── TTLs (seconds) ───────────────────────────────────────────
// With Upstash LRU eviction enabled, TTLs are for freshness, not memory.

export const ttl = {
  referenceData: 86400, // 24 hours — departments, titles, templates
  project: 3600, // 1 hour
  projectList: 3600, // 1 hour
  people: 1800, // 30 minutes
  personMe: 3600, // 1 hour
  clerkPerson: 3600, // 1 hour
  mgmtChain: 1800, // 30 minutes
  githubStats: 3600, // 1 hour
} as const;

// ── Cache-Aside Helper ──────────────────────────────────────

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetch: () => Promise<T>,
): Promise<T> {
  const hit = await redis.get<T>(key);
  if (hit !== null && hit !== undefined) return hit;
  const data = await fetch();
  await redis.set(key, data, { ex: ttlSeconds });
  return data;
}

// ── Invalidation Helpers ─────────────────────────────────────

export async function invalidateReferenceData() {
  await redis.del(cacheKeys.departments, cacheKeys.titles);
}

export async function invalidateProjectCache(projectId: string) {
  await redis.del(cacheKeys.project(projectId), cacheKeys.projectList);
}

export async function invalidatePeopleCache(clerkUserId?: string | null) {
  const keys: string[] = [cacheKeys.people];
  if (clerkUserId) {
    keys.push(cacheKeys.personMe(clerkUserId));
  }
  await redis.del(...keys);
}

export async function invalidateMgmtChain(personId: string) {
  await redis.del(cacheKeys.mgmtChain(personId));
}

export async function invalidateGithubStats(projectId: string) {
  await redis.del(cacheKeys.githubStats(projectId));
}

export async function invalidateMeetingTemplates() {
  await redis.del(cacheKeys.meetingTemplates);
}
