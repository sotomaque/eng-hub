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
  role: true,
  title: true,
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
  roleId: z.string().optional().or(z.literal("")),
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

export const personRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return db.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: personInclude,
    });
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
          roleId: input.roleId || null,
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

  update: protectedProcedure
    .input(updatePersonSchema)
    .mutation(async ({ ctx, input }) => {
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
          roleId: data.roleId || null,
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
      }

      return person;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
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
      return db.$transaction(async (tx) => {
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
      return db.$transaction(async (tx) => {
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
    }),

  leaveProject: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
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

      return db.person.update({
        where: { id: input.personId },
        data: { clerkUserId: ctx.userId },
      });
    }),

  unclaimMe: protectedProcedure.mutation(async ({ ctx }) => {
    await db.person.updateMany({
      where: { clerkUserId: ctx.userId },
      data: { clerkUserId: null },
    });
  }),
});
