import { db } from "@workspace/db";
import { z } from "zod";
import { syncLiveToActiveArrangement } from "../lib/sync-arrangement";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const createPersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

const updatePersonSchema = createPersonSchema.extend({
  id: z.string(),
});

export const personRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    return db.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        projectMemberships: {
          include: {
            project: true,
            role: true,
            title: true,
            teamMemberships: { include: { team: true } },
          },
        },
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.person.findUnique({
        where: { id: input.id },
        include: {
          projectMemberships: {
            include: {
              project: true,
              role: true,
              title: true,
              teamMemberships: { include: { team: true } },
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(createPersonSchema)
    .mutation(async ({ input }) => {
      return db.person.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          githubUsername: input.githubUsername || null,
          gitlabUsername: input.gitlabUsername || null,
          imageUrl: input.imageUrl || null,
        },
      });
    }),

  update: protectedProcedure
    .input(updatePersonSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.person.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          githubUsername: data.githubUsername || null,
          gitlabUsername: data.gitlabUsername || null,
          imageUrl: data.imageUrl || null,
        },
      });
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
        roleId: z.string(),
        titleId: z.string().optional().or(z.literal("")),
        teamIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const member = await tx.teamMember.create({
          data: {
            personId: input.personId,
            projectId: input.projectId,
            roleId: input.roleId,
            titleId: input.titleId || null,
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
        roleId: z.string(),
        titleId: z.string().optional().or(z.literal("")),
        teamIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        // Remove from old project
        await tx.teamMember.delete({
          where: {
            personId_projectId: {
              personId: input.personId,
              projectId: input.fromProjectId,
            },
          },
        });
        await syncLiveToActiveArrangement(tx, input.fromProjectId);

        // Add to new project
        const member = await tx.teamMember.create({
          data: {
            personId: input.personId,
            projectId: input.toProjectId,
            roleId: input.roleId,
            titleId: input.titleId || null,
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
      include: {
        projectMemberships: {
          include: {
            project: true,
            role: true,
            title: true,
            teamMemberships: { include: { team: true } },
          },
        },
      },
    });
  }),

  claimAsMe: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Unclaim any previously linked Person for this Clerk user
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
