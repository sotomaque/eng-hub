import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import {
  cached,
  cacheKeys,
  invalidateMgmtChain,
  invalidatePeopleCache,
  ttl,
} from "../lib/cache";
import { redis } from "../lib/redis";
import { syncLiveToActiveArrangement } from "../lib/sync-arrangement";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const managerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  callsign: true,
  imageUrl: true,
} as const;

const personInclude = {
  manager: { select: managerSelect },
  directReports: { select: { ...managerSelect, email: true } },
  department: true,
  title: { include: { department: true } },
  projectMemberships: {
    include: {
      project: true,
      teamMemberships: { include: { team: true } },
    },
  },
  milestoneAssignments: {
    include: {
      milestone: {
        select: {
          id: true,
          title: true,
          status: true,
          targetDate: true,
          projectId: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  },
  quarterlyGoalAssignments: {
    include: {
      quarterlyGoal: {
        select: {
          id: true,
          title: true,
          status: true,
          quarter: true,
          targetDate: true,
          projectId: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const;

const personListInclude = {
  department: true,
  title: { include: { department: true } },
  projectMemberships: {
    include: {
      project: true,
      teamMemberships: { include: { team: true } },
    },
  },
} as const;

const createPersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  callsign: z.string().optional().or(z.literal("")),
  email: z.string().email(),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  titleId: z.string().optional().or(z.literal("")),
});

const updatePersonSchema = createPersonSchema.extend({
  id: z.string(),
});

async function detectCycle(
  personId: string,
  newManagerId: string,
): Promise<boolean> {
  let currentId: string | null = newManagerId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === personId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const row: { managerId: string | null } | null = await db.person.findUnique(
      {
        where: { id: currentId },
        select: { managerId: true },
      },
    );
    currentId = row?.managerId ?? null;
  }
  return false;
}

/**
 * Invalidate management chain caches for a person and their direct reports.
 */
async function invalidateManagerChains(personId: string) {
  await invalidateMgmtChain(personId);
  const reports = await db.person.findMany({
    where: { managerId: personId },
    select: { id: true },
  });
  await Promise.all(reports.map((r) => invalidateMgmtChain(r.id)));
}

export const personRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return cached(cacheKeys.people, ttl.people, () =>
      db.person.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        include: personInclude,
      }),
    );
  }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(10),
        search: z.string().optional(),
        multiProject: z.boolean().optional(),
        sortBy: z
          .enum(["name", "email", "department"])
          .optional()
          .default("name"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
      }),
    )
    .query(async ({ input }) => {
      let multiProjectIds: string[] | undefined;
      if (input.multiProject) {
        const grouped = await db.teamMember.groupBy({
          by: ["personId"],
          _count: { personId: true },
          having: { personId: { _count: { gt: 1 } } },
        });
        multiProjectIds = grouped.map((r) => r.personId);
      }

      const where: Record<string, unknown> = {};
      if (input.search) {
        where.OR = [
          {
            firstName: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          },
          {
            lastName: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          },
          {
            callsign: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          },
        ];
      }
      if (multiProjectIds) {
        where.id = { in: multiProjectIds };
      }

      const orderByMap: Record<string, object[]> = {
        name: [{ lastName: input.sortOrder }, { firstName: input.sortOrder }],
        email: [{ email: input.sortOrder }],
        department: [
          { department: { name: input.sortOrder } },
          { lastName: "asc" },
        ],
      };
      const orderBy = orderByMap[input.sortBy] ?? orderByMap.name;

      const [items, totalCount] = await Promise.all([
        db.person.findMany({
          where,
          orderBy,
          include: personListInclude,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        db.person.count({ where }),
      ]);
      return { items, totalCount };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.person.findUnique({
        where: { id: input.id },
        include: personInclude,
      });
    }),

  create: protectedProcedure
    .input(createPersonSchema)
    .mutation(async ({ ctx, input }) => {
      const managerId = input.managerId || null;
      const person = await db.person.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          callsign: input.callsign || null,
          email: input.email,
          githubUsername: input.githubUsername || null,
          gitlabUsername: input.gitlabUsername || null,
          imageUrl: input.imageUrl || null,
          managerId,
          departmentId: input.departmentId || null,
          titleId: input.titleId || null,
        },
      });

      if (managerId) {
        await db.managerChange.create({
          data: {
            personId: person.id,
            oldManagerId: null,
            newManagerId: managerId,
            changedBy: ctx.userId,
          },
        });
      }

      await invalidatePeopleCache();
      return person;
    }),

  update: protectedProcedure
    .input(updatePersonSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const newManagerId = data.managerId || null;

      // Get current state
      const current = await db.person.findUniqueOrThrow({
        where: { id },
        select: { managerId: true, clerkUserId: true },
      });

      // Cycle detection
      if (newManagerId && newManagerId !== current.managerId) {
        const hasCycle = await detectCycle(id, newManagerId);
        if (hasCycle) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot set this manager — it would create a circular reporting chain.",
          });
        }
      }

      const person = await db.person.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          callsign: data.callsign || null,
          email: data.email,
          githubUsername: data.githubUsername || null,
          gitlabUsername: data.gitlabUsername || null,
          imageUrl: data.imageUrl || null,
          managerId: newManagerId,
          departmentId: data.departmentId || null,
          titleId: data.titleId || null,
        },
      });

      // Log manager change if it changed
      if (newManagerId !== current.managerId) {
        await db.managerChange.create({
          data: {
            personId: id,
            oldManagerId: current.managerId,
            newManagerId,
            changedBy: ctx.userId,
          },
        });
        // Invalidate management chain caches
        await invalidateManagerChains(id);
      }

      await invalidatePeopleCache(current.clerkUserId);
      return person;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const person = await db.person.findUnique({
        where: { id: input.id },
        select: { clerkUserId: true },
      });
      const result = await db.person.delete({ where: { id: input.id } });
      await Promise.all([
        invalidatePeopleCache(person?.clerkUserId),
        invalidateManagerChains(input.id),
      ]);
      return result;
    }),

  joinProject: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
        projectId: z.string(),
        teamIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.$transaction(async (tx) => {
        const member = await tx.teamMember.create({
          data: {
            personId: input.personId,
            projectId: input.projectId,
          },
        });

        const teamIds = input.teamIds?.filter(Boolean) ?? [];
        if (teamIds.length > 0) {
          await tx.teamMembership.createMany({
            data: teamIds.map((teamId) => ({
              teamId,
              teamMemberId: member.id,
            })),
          });
        }

        await syncLiveToActiveArrangement(tx, input.projectId);
        return member;
      });
      await invalidatePeopleCache();
      return result;
    }),

  moveToProject: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
        fromProjectId: z.string(),
        toProjectId: z.string(),
        teamIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.$transaction(async (tx) => {
        await tx.teamMember.delete({
          where: {
            personId_projectId: {
              personId: input.personId,
              projectId: input.fromProjectId,
            },
          },
        });
        await syncLiveToActiveArrangement(tx, input.fromProjectId);

        const member = await tx.teamMember.create({
          data: {
            personId: input.personId,
            projectId: input.toProjectId,
          },
        });

        const teamIds = input.teamIds?.filter(Boolean) ?? [];
        if (teamIds.length > 0) {
          await tx.teamMembership.createMany({
            data: teamIds.map((teamId) => ({
              teamId,
              teamMemberId: member.id,
            })),
          });
        }

        await syncLiveToActiveArrangement(tx, input.toProjectId);
        return member;
      });
      await invalidatePeopleCache();
      return result;
    }),

  leaveProject: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.$transaction(async (tx) => {
        await tx.teamMember.delete({
          where: {
            personId_projectId: {
              personId: input.personId,
              projectId: input.projectId,
            },
          },
        });
        await syncLiveToActiveArrangement(tx, input.projectId);
      });
      await invalidatePeopleCache();
      return result;
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return cached(cacheKeys.personMe(ctx.userId), ttl.personMe, () =>
      db.person.findUnique({
        where: { clerkUserId: ctx.userId },
        include: personInclude,
      }),
    );
  }),

  claimAsMe: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.person.updateMany({
        where: { clerkUserId: ctx.userId },
        data: { clerkUserId: null },
      });

      const result = await db.person.update({
        where: { id: input.personId },
        data: { clerkUserId: ctx.userId },
      });
      await invalidatePeopleCache(ctx.userId);
      await redis.del(cacheKeys.clerkPerson(ctx.userId));
      return result;
    }),

  unclaimMe: protectedProcedure.mutation(async ({ ctx }) => {
    await db.person.updateMany({
      where: { clerkUserId: ctx.userId },
      data: { clerkUserId: null },
    });
    await invalidatePeopleCache(ctx.userId);
    await redis.del(cacheKeys.clerkPerson(ctx.userId));
  }),
});
