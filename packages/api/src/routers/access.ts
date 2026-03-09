import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { resolveAccess } from "../lib/access";
import { ALL_CAPABILITIES } from "../lib/capabilities";
import { adminProcedure, createTRPCRouter, protectedProcedure } from "../trpc";

export const accessRouter = createTRPCRouter({
  /** Return the current user's resolved capabilities (for frontend gating). */
  myAccess: protectedProcedure.query(({ ctx }) => {
    const caps = Array.from(ctx.access.capabilities);
    const projectCaps: Record<string, string[]> = {};
    for (const [projectId, capSet] of ctx.access.projectCapabilities) {
      projectCaps[projectId] = Array.from(capSet);
    }
    return {
      personId: ctx.access.personId,
      capabilities: caps,
      projectCapabilities: projectCaps,
      isAdmin: ctx.access.isAdmin,
    };
  }),

  /** List all capability keys (for admin UI). */
  allCapabilities: adminProcedure.query(() => {
    return ALL_CAPABILITIES;
  }),

  // ── Profile CRUD ─────────────────────────────────────────────

  listProfiles: adminProcedure.query(async () => {
    return db.accessProfile.findMany({ orderBy: { name: "asc" } });
  }),

  getProfile: adminProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const profile = await db.accessProfile.findUnique({ where: { id: input.id } });
    if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
    return profile;
  }),

  createProfile: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        capabilities: z.array(z.string()),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.accessProfile.create({
        data: {
          name: input.name,
          description: input.description,
          capabilities: input.capabilities,
          isDefault: input.isDefault ?? false,
        },
      });
    }),

  updateProfile: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        capabilities: z.array(z.string()).optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.accessProfile.update({ where: { id }, data });
    }),

  deleteProfile: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    return db.accessProfile.delete({ where: { id: input.id } });
  }),

  // ── Grant Management ─────────────────────────────────────────

  listGrants: adminProcedure
    .input(
      z
        .object({
          personId: z.string().optional(),
          projectId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return db.accessGrant.findMany({
        where: {
          personId: input?.personId,
          projectId: input?.projectId,
        },
        include: {
          person: { select: { id: true, firstName: true, lastName: true, imageUrl: true } },
          profile: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  assignProfile: adminProcedure
    .input(
      z.object({
        personId: z.string(),
        profileId: z.string(),
        projectId: z.string().nullish(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.accessGrant.create({
        data: {
          personId: input.personId,
          profileId: input.profileId,
          projectId: input.projectId ?? null,
        },
      });
    }),

  removeGrant: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    return db.accessGrant.delete({ where: { id: input.id } });
  }),

  bulkAssign: adminProcedure
    .input(
      z.object({
        personIds: z.array(z.string()),
        profileId: z.string(),
        projectId: z.string().nullish(),
      }),
    )
    .mutation(async ({ input }) => {
      const data = input.personIds.map((personId) => ({
        personId,
        profileId: input.profileId,
        projectId: input.projectId ?? null,
      }));
      return db.accessGrant.createMany({ data, skipDuplicates: true });
    }),

  // ── Override Management ──────────────────────────────────────

  listOverrides: adminProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ input }) => {
      return db.accessOverride.findMany({
        where: { personId: input.personId },
        orderBy: { capability: "asc" },
      });
    }),

  setOverride: adminProcedure
    .input(
      z.object({
        personId: z.string(),
        projectId: z.string().nullish(),
        capability: z.string(),
        effect: z.enum(["allow", "deny"]),
      }),
    )
    .mutation(async ({ input }) => {
      return db.accessOverride.upsert({
        where: {
          personId_projectId_capability: {
            personId: input.personId,
            projectId: input.projectId ?? "",
            capability: input.capability,
          },
        },
        create: {
          personId: input.personId,
          projectId: input.projectId ?? null,
          capability: input.capability,
          effect: input.effect,
        },
        update: { effect: input.effect },
      });
    }),

  removeOverride: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    return db.accessOverride.delete({ where: { id: input.id } });
  }),

  /** Re-resolve a specific person's access (admin preview). */
  previewAccess: adminProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ input }) => {
      const access = await resolveAccess(input.personId);
      return {
        personId: access.personId,
        capabilities: Array.from(access.capabilities),
        projectCapabilities: Object.fromEntries(
          Array.from(access.projectCapabilities.entries()).map(([k, v]) => [k, Array.from(v)]),
        ),
        isAdmin: access.isAdmin,
      };
    }),
});
