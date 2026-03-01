import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
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
      project: { select: { id: true, name: true } },
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
  ownedProjects: {
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { project: { name: "asc" } },
  },
} as const;

/** Minimal select for the edit sheet — omits milestones, goals, ownedProjects, directReports. */
const personEditSelect = {
  id: true,
  firstName: true,
  lastName: true,
  callsign: true,
  email: true,
  imageUrl: true,
  githubUsername: true,
  gitlabUsername: true,
  managerId: true,
  departmentId: true,
  titleId: true,
  department: { select: { id: true, name: true } },
  title: { select: { id: true, name: true } },
  projectMemberships: {
    where: { leftAt: null },
    select: {
      id: true,
      projectId: true,
      leftAt: true,
      project: { select: { id: true, name: true } },
    },
  },
} as const;

const personListInclude = {
  manager: { select: managerSelect },
  department: true,
  title: { include: { department: true } },
  projectMemberships: {
    include: {
      project: { select: { id: true, name: true } },
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

/**
 * Detect if setting newManagerId as the manager of personId would create a cycle.
 * Uses a recursive CTE to walk the chain from newManagerId upward in a single query.
 */
async function detectCycle(personId: string, newManagerId: string): Promise<boolean> {
  const result = await db.$queryRaw<{ found: boolean }[]>`
    WITH RECURSIVE chain AS (
      SELECT id, manager_id
      FROM people
      WHERE id = ${newManagerId}
      UNION ALL
      SELECT p.id, p.manager_id
      FROM people p
      JOIN chain c ON p.id = c.manager_id
      WHERE c.manager_id IS NOT NULL AND c.manager_id != ${personId}
    )
    SELECT EXISTS (SELECT 1 FROM chain WHERE id = ${personId}) AS found
  `;
  return result[0]?.found ?? false;
}

export const personRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return db.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: personListInclude,
      take: 1000,
    });
  }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(10),
        search: z.string().optional(),
        departments: z.array(z.string()).optional(),
        projects: z.array(z.string()).optional(),
        multiProject: z.boolean().optional(),
        sortBy: z.enum(["name", "email", "department"]).optional().default("name"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
      }),
    )
    .query(async ({ input }) => {
      let multiProjectIds: string[] | undefined;
      if (input.multiProject) {
        const grouped = await db.teamMember.groupBy({
          by: ["personId"],
          where: { leftAt: null },
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
      if (input.departments?.length) {
        where.department = { name: { in: input.departments } };
      }
      if (input.projects?.length) {
        where.projectMemberships = {
          some: { project: { name: { in: input.projects } }, leftAt: null },
        };
      }
      if (multiProjectIds) {
        where.id = { in: multiProjectIds };
      }

      const orderByMap: Record<string, object[]> = {
        name: [{ lastName: input.sortOrder }, { firstName: input.sortOrder }],
        email: [{ email: input.sortOrder }],
        department: [{ department: { name: input.sortOrder } }, { lastName: "asc" }],
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

  listExport: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        departments: z.array(z.string()).optional(),
        projects: z.array(z.string()).optional(),
        multiProject: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      let multiProjectIds: string[] | undefined;
      if (input.multiProject) {
        const grouped = await db.teamMember.groupBy({
          by: ["personId"],
          where: { leftAt: null },
          _count: { personId: true },
          having: { personId: { _count: { gt: 1 } } },
        });
        multiProjectIds = grouped.map((r) => r.personId);
      }

      const where: Record<string, unknown> = {};
      if (input.search) {
        where.OR = [
          { firstName: { contains: input.search, mode: "insensitive" as const } },
          { lastName: { contains: input.search, mode: "insensitive" as const } },
          { email: { contains: input.search, mode: "insensitive" as const } },
          { callsign: { contains: input.search, mode: "insensitive" as const } },
        ];
      }
      if (input.departments?.length) {
        where.department = { name: { in: input.departments } };
      }
      if (input.projects?.length) {
        where.projectMemberships = {
          some: { project: { name: { in: input.projects } }, leftAt: null },
        };
      }
      if (multiProjectIds) {
        where.id = { in: multiProjectIds };
      }

      const people = await db.person.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 2000,
        include: {
          department: true,
          title: true,
          projectMemberships: {
            include: { project: { select: { name: true } } },
          },
        },
      });

      return people.map((p) => ({
        "First Name": p.firstName,
        "Last Name": p.lastName,
        Email: p.email,
        Department: p.department?.name ?? "",
        Title: p.title?.name ?? "",
        Projects: p.projectMemberships
          .filter((m) => !m.leftAt)
          .map((m) => m.project.name)
          .join(", "),
        GitHub: p.githubUsername ?? "",
        GitLab: p.gitlabUsername ?? "",
      }));
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.person.findUnique({
      where: { id: input.id },
      include: personInclude,
    });
  }),

  /** Lightweight fetch for the edit sheet — omits milestones, goals, reports, etc. */
  getForEdit: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.person.findUnique({
      where: { id: input.id },
      select: personEditSelect,
    });
  }),

  create: protectedProcedure.input(createPersonSchema).mutation(async ({ ctx, input }) => {
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

    return person;
  }),

  update: protectedProcedure.input(updatePersonSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const newManagerId = data.managerId || null;

    // Get current state
    const current = await db.person.findUniqueOrThrow({
      where: { id },
      select: { managerId: true },
    });

    // Cycle detection
    if (newManagerId && newManagerId !== current.managerId) {
      const hasCycle = await detectCycle(id, newManagerId);
      if (hasCycle) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot set this manager — it would create a circular reporting chain.",
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
    const managerChanged = newManagerId !== current.managerId;
    if (managerChanged) {
      await db.managerChange.create({
        data: {
          personId: id,
          oldManagerId: current.managerId,
          newManagerId,
          changedBy: ctx.userId,
        },
      });
    }

    return person;
  }),

  reassignReports: protectedProcedure
    .input(
      z.object({
        personIds: z.array(z.string()).min(1),
        newManagerId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { personIds, newManagerId } = input;

      const newManager = await db.person.findUnique({
        where: { id: newManagerId },
        select: { id: true },
      });
      if (!newManager) {
        throw new TRPCError({ code: "NOT_FOUND", message: "New manager not found." });
      }

      const cycleResults = await Promise.all(
        personIds.map((personId) => detectCycle(personId, newManagerId)),
      );
      if (cycleResults.some(Boolean)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reassign — it would create a circular reporting chain.",
        });
      }

      await db.$transaction(async (tx) => {
        // Batch-fetch all current manager IDs in one query
        const currentPeople = await tx.person.findMany({
          where: { id: { in: personIds } },
          select: { id: true, managerId: true },
        });
        const managerMap = new Map(currentPeople.map((p) => [p.id, p.managerId]));

        // Batch-update all people in one query
        await tx.person.updateMany({
          where: { id: { in: personIds } },
          data: { managerId: newManagerId },
        });

        // Batch-create all manager change records in one query
        await tx.managerChange.createMany({
          data: personIds.map((personId) => ({
            personId,
            oldManagerId: managerMap.get(personId) ?? null,
            newManagerId,
            changedBy: ctx.userId,
          })),
        });
      });

      return { count: personIds.length };
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    return db.person.delete({ where: { id: input.id } });
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
        // Reactivate rolled-off record if one exists, otherwise create new
        const rolledOff = await tx.teamMember.findFirst({
          where: { personId: input.personId, projectId: input.projectId, leftAt: { not: null } },
        });
        const member = rolledOff
          ? await tx.teamMember.update({ where: { id: rolledOff.id }, data: { leftAt: null } })
          : await tx.teamMember.create({
              data: { personId: input.personId, projectId: input.projectId },
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
        // Soft-delete from source project
        const sourceRecord = await tx.teamMember.findFirst({
          where: { personId: input.personId, projectId: input.fromProjectId, leftAt: null },
        });
        if (sourceRecord) {
          await tx.teamMember.update({
            where: { id: sourceRecord.id },
            data: { leftAt: new Date() },
          });
          await tx.teamMembership.deleteMany({ where: { teamMemberId: sourceRecord.id } });
          await tx.arrangementAssignment.deleteMany({ where: { teamMemberId: sourceRecord.id } });
        }
        await syncLiveToActiveArrangement(tx, input.fromProjectId);

        // Reactivate or create on destination project
        const rolledOff = await tx.teamMember.findFirst({
          where: { personId: input.personId, projectId: input.toProjectId, leftAt: { not: null } },
        });
        const member = rolledOff
          ? await tx.teamMember.update({ where: { id: rolledOff.id }, data: { leftAt: null } })
          : await tx.teamMember.create({
              data: { personId: input.personId, projectId: input.toProjectId },
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
        const record = await tx.teamMember.findFirst({
          where: { personId: input.personId, projectId: input.projectId, leftAt: null },
        });
        if (record) {
          await tx.teamMember.update({ where: { id: record.id }, data: { leftAt: new Date() } });
          await tx.teamMembership.deleteMany({ where: { teamMemberId: record.id } });
          await tx.arrangementAssignment.deleteMany({ where: { teamMemberId: record.id } });
        }
        await syncLiveToActiveArrangement(tx, input.projectId);
      });
      return result;
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return db.person.findUnique({
      where: { clerkUserId: ctx.userId },
      include: personInclude,
    });
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
      return result;
    }),

  unclaimMe: protectedProcedure.mutation(async ({ ctx }) => {
    await db.person.updateMany({
      where: { clerkUserId: ctx.userId },
      data: { clerkUserId: null },
    });
  }),
});
