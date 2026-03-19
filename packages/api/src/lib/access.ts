import { db } from "@workspace/db";
import type { Capability } from "./capabilities";
import { MANAGER_INHERITED_CAPABILITIES } from "./capabilities";

// ── Types ────────────────────────────────────────────────────

export type ResolvedAccess = {
  personId: string;
  /** Global (unscoped) capabilities from profiles + overrides */
  capabilities: Set<string>;
  /** Project-scoped capabilities: projectId → Set<cap> */
  projectCapabilities: Map<string, Set<string>>;
  /** Shortcut flag */
  isAdmin: boolean;
};

// ── Resolve ──────────────────────────────────────────────────

/**
 * Resolve all stored capabilities for a person.
 * Two DB queries: grants (with profile) + overrides.
 */
export async function resolveAccess(personId: string): Promise<ResolvedAccess> {
  const [grants, overrides] = await Promise.all([
    db.accessGrant.findMany({
      where: { personId },
      include: { profile: { select: { capabilities: true } } },
    }),
    db.accessOverride.findMany({
      where: { personId },
    }),
  ]);

  const globalCaps = new Set<string>();
  const projectCaps = new Map<string, Set<string>>();

  // 1. Collect capabilities from granted profiles
  for (const grant of grants) {
    const caps = grant.profile.capabilities;
    if (grant.projectId) {
      let set = projectCaps.get(grant.projectId);
      if (!set) {
        set = new Set<string>();
        projectCaps.set(grant.projectId, set);
      }
      for (const cap of caps) set.add(cap);
    } else {
      for (const cap of caps) globalCaps.add(cap);
    }
  }

  // 2. Apply overrides (deny removes, allow adds)
  for (const override of overrides) {
    if (override.effect === "deny") {
      if (override.projectId) {
        projectCaps.get(override.projectId)?.delete(override.capability);
      } else {
        globalCaps.delete(override.capability);
      }
    } else if (override.effect === "allow") {
      if (override.projectId) {
        let set = projectCaps.get(override.projectId);
        if (!set) {
          set = new Set<string>();
          projectCaps.set(override.projectId, set);
        }
        set.add(override.capability);
      } else {
        globalCaps.add(override.capability);
      }
    }
  }

  return {
    personId,
    capabilities: globalCaps,
    projectCapabilities: projectCaps,
    isAdmin: globalCaps.has("admin:access"),
  };
}

// ── Check helpers ────────────────────────────────────────────

/**
 * Check a capability globally or for a specific project.
 * Admin bypasses all checks.
 */
export function hasCapability(
  access: ResolvedAccess,
  cap: Capability | string,
  projectId?: string | null,
): boolean {
  if (access.isAdmin) return true;
  if (access.capabilities.has(cap)) return true;
  if (projectId) {
    const projCaps = access.projectCapabilities.get(projectId);
    if (projCaps?.has(cap)) return true;
  }
  return false;
}

/**
 * Check a person-scoped capability with self-access and hierarchy fallback.
 * - Users always have access to their own data.
 * - Managers inherit certain capabilities for reports in their chain.
 */
export async function hasPersonCapability(
  access: ResolvedAccess,
  cap: Capability | string,
  targetPersonId: string,
): Promise<boolean> {
  if (access.isAdmin) return true;

  // Self-access: always allowed
  if (access.personId === targetPersonId) return true;

  // Stored capability check
  if (access.capabilities.has(cap)) return true;

  // Hierarchy check for manager-inherited capabilities
  if ((MANAGER_INHERITED_CAPABILITIES as readonly string[]).includes(cap)) {
    const inChain = await isInManagementChain(access.personId, targetPersonId);
    if (inChain) return true;
  }

  return false;
}

// ── Assert helpers (throw on denial) ─────────────────────────

export function assertAccess(
  access: ResolvedAccess,
  cap: Capability | string,
  projectId?: string | null,
): void {
  if (!hasCapability(access, cap, projectId)) {
    throw new AccessDeniedError(cap);
  }
}

class AccessDeniedError extends Error {
  code = "FORBIDDEN" as const;
  constructor(cap: string) {
    super(`Missing capability: ${cap}`);
    this.name = "AccessDeniedError";
  }
}

// ── Hierarchy (moved from hierarchy.ts) ──────────────────────

/**
 * Build the full management chain (list of manager IDs) for a person.
 * Uses a recursive CTE in a single query.
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
 * Check if viewerId is in the management chain above targetPersonId.
 */
export async function isInManagementChain(
  viewerId: string,
  targetPersonId: string,
): Promise<boolean> {
  const chain = await getManagementChain(targetPersonId);
  return chain.includes(viewerId);
}
