import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { CAPABILITIES } from "../lib/capabilities";
import { syncLiveToActiveArrangement } from "../lib/sync-arrangement";
import { createTRPCRouter, protectedProcedure, requireCapability } from "../trpc";

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
  emailAliases: true,
  imageUrl: true,
  githubUsername: true,
  gitlabUsername: true,
  managerId: true,
  departmentId: true,
  titleId: true,
  hireDate: true,
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
  emailAliases: z.array(z.string().trim().min(1)).optional().default([]),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  titleId: z.string().optional().or(z.literal("")),
  hireDate: z.coerce.date().nullable().optional(),
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
  getAll: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_READ))
    .input(z.object({ includeDeparted: z.boolean().optional().default(false) }).optional())
    .query(async ({ input }) => {
      const includeDeparted = input?.includeDeparted ?? false;
      return db.person.findMany({
        where: includeDeparted ? {} : { leftAt: null },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        include: personListInclude,
        take: 1000,
      });
    }),

  list: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_READ))
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(10),
        search: z.string().optional(),
        departments: z.array(z.string()).optional(),
        projects: z.array(z.string()).optional(),
        skills: z.array(z.string()).optional(),
        multiProject: z.boolean().optional(),
        includeDeparted: z.boolean().optional().default(false),
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
      if (!input.includeDeparted) {
        where.leftAt = null;
      }
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
      if (input.skills?.length) {
        where.personSkills = { some: { skill: { name: { in: input.skills } } } };
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
    .use(requireCapability(CAPABILITIES.PERSON_READ))
    .input(
      z.object({
        search: z.string().optional(),
        departments: z.array(z.string()).optional(),
        projects: z.array(z.string()).optional(),
        skills: z.array(z.string()).optional(),
        multiProject: z.boolean().optional(),
        includeDeparted: z.boolean().optional().default(false),
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
      if (!input.includeDeparted) {
        where.leftAt = null;
      }
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
      if (input.skills?.length) {
        where.personSkills = { some: { skill: { name: { in: input.skills } } } };
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

  getById: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_READ))
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.person.findUnique({
        where: { id: input.id },
        include: personInclude,
      });
    }),

  /** Lightweight fetch for the edit sheet — omits milestones, goals, reports, etc. */
  getForEdit: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_READ))
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.person.findUnique({
        where: { id: input.id },
        select: personEditSelect,
      });
    }),

  create: protectedProcedure
    .input(createPersonSchema)
    .use(requireCapability(CAPABILITIES.PERSON_WRITE))
    .mutation(async ({ ctx, input }) => {
      const managerId = input.managerId || null;
      const titleId = input.titleId || null;
      const person = await db.person.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          callsign: input.callsign || null,
          email: input.email,
          emailAliases: input.emailAliases ?? [],
          githubUsername: input.githubUsername || null,
          gitlabUsername: input.gitlabUsername || null,
          imageUrl: input.imageUrl || null,
          managerId,
          departmentId: input.departmentId || null,
          titleId,
          hireDate: input.hireDate ?? null,
        },
      });

      // Log initial manager + title in parallel (independent writes)
      const initialAudits: Promise<unknown>[] = [];
      if (managerId) {
        initialAudits.push(
          db.managerChange.create({
            data: {
              personId: person.id,
              oldManagerId: null,
              newManagerId: managerId,
              changedBy: ctx.userId,
            },
          }),
        );
      }
      if (titleId) {
        initialAudits.push(
          db.titleChange.create({
            data: {
              personId: person.id,
              oldTitleId: null,
              newTitleId: titleId,
              changedBy: ctx.userId,
              effectiveAt: input.hireDate ?? new Date(),
            },
          }),
        );
      }
      if (initialAudits.length > 0) {
        await Promise.all(initialAudits);
      }

      return person;
    }),

  update: protectedProcedure
    .input(updatePersonSchema)
    .use(requireCapability(CAPABILITIES.PERSON_WRITE))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const newManagerId = data.managerId || null;
      const newTitleId = data.titleId || null;

      // Get current state
      const current = await db.person.findUniqueOrThrow({
        where: { id },
        select: { managerId: true, titleId: true },
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
          emailAliases: data.emailAliases ?? [],
          githubUsername: data.githubUsername || null,
          gitlabUsername: data.gitlabUsername || null,
          imageUrl: data.imageUrl || null,
          managerId: newManagerId,
          departmentId: data.departmentId || null,
          titleId: newTitleId,
          hireDate: data.hireDate ?? null,
        },
      });

      // Log audit rows in parallel (independent writes)
      const auditWrites: Promise<unknown>[] = [];
      if (newManagerId !== current.managerId) {
        auditWrites.push(
          db.managerChange.create({
            data: {
              personId: id,
              oldManagerId: current.managerId,
              newManagerId,
              changedBy: ctx.userId,
            },
          }),
        );
      }
      if (newTitleId !== current.titleId) {
        auditWrites.push(
          db.titleChange.create({
            data: {
              personId: id,
              oldTitleId: current.titleId,
              newTitleId,
              changedBy: ctx.userId,
              effectiveAt: new Date(),
            },
          }),
        );
      }
      if (auditWrites.length > 0) {
        await Promise.all(auditWrites);
      }

      return person;
    }),

  reassignReports: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_WRITE))
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

  getDepartureImpact: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_READ))
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [directReports, ownedProjects] = await Promise.all([
        db.person.findMany({
          where: { managerId: input.id, leftAt: null },
          select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        }),
        db.projectOwner.findMany({
          where: { personId: input.id },
          select: { project: { select: { id: true, name: true } } },
          orderBy: { project: { name: "asc" } },
        }),
      ]);
      return {
        directReports,
        ownedProjects: ownedProjects.map((o) => o.project),
      };
    }),

  markAsDeparted: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_WRITE))
    .input(
      z.object({
        id: z.string(),
        leftAt: z.coerce.date(),
      }),
    )
    .mutation(async ({ input }) => {
      const activeReports = await db.person.count({
        where: { managerId: input.id, leftAt: null },
      });
      if (activeReports > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "This person has active direct reports. Reassign them before marking as departed.",
        });
      }

      return db.$transaction(async (tx) => {
        const person = await tx.person.update({
          where: { id: input.id },
          data: { leftAt: input.leftAt },
        });
        await tx.teamMember.updateMany({
          where: { personId: input.id, leftAt: null },
          data: { leftAt: input.leftAt },
        });
        return person;
      });
    }),

  joinProject: protectedProcedure
    .use(requireCapability(CAPABILITIES.PROJECT_TEAM_WRITE))
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
    .use(requireCapability(CAPABILITIES.PROJECT_TEAM_WRITE))
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
    .use(requireCapability(CAPABILITIES.PROJECT_TEAM_WRITE))
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

  getTitleHistory: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_READ))
    .input(z.object({ personId: z.string() }))
    .query(async ({ input }) => {
      return db.titleChange.findMany({
        where: { personId: input.personId },
        include: {
          oldTitle: { select: { id: true, name: true } },
          newTitle: { select: { id: true, name: true } },
        },
        orderBy: { effectiveAt: "desc" },
      });
    }),

  addTitleHistoryEntry: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_WRITE))
    .input(
      z.object({
        personId: z.string(),
        oldTitleId: z.string().nullable(),
        newTitleId: z.string().nullable(),
        effectiveAt: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return db.titleChange.create({
        data: {
          personId: input.personId,
          oldTitleId: input.oldTitleId,
          newTitleId: input.newTitleId,
          changedBy: ctx.userId,
          effectiveAt: input.effectiveAt,
        },
      });
    }),

  deleteTitleHistoryEntry: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_WRITE))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.titleChange.delete({ where: { id: input.id } });
    }),
});
