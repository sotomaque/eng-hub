import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const arrangementRouter = createTRPCRouter({
  getByProjectId: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.teamArrangement.findMany({
        where: { projectId: input.projectId },
        orderBy: { updatedAt: "desc" },
        include: {
          teams: {
            include: {
              _count: { select: { assignments: true } },
            },
          },
        },
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const arrangement = await db.teamArrangement.findUnique({
        where: { id: input.id },
        include: {
          teams: {
            orderBy: { sortOrder: "asc" },
            include: {
              assignments: {
                include: {
                  teamMember: { include: { role: true, title: true } },
                },
                orderBy: { teamMember: { lastName: "asc" } },
              },
            },
          },
        },
      });

      if (!arrangement) return null;

      // Get all project members to determine unassigned ones
      const allMembers = await db.teamMember.findMany({
        where: { projectId: arrangement.projectId },
        include: { role: true, title: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });

      const assignedMemberIds = new Set(
        arrangement.teams.flatMap((t) =>
          t.assignments.map((a) => a.teamMemberId),
        ),
      );

      const unassignedMembers = allMembers.filter(
        (m) => !assignedMemberIds.has(m.id),
      );

      return { ...arrangement, unassignedMembers };
    }),

  create: protectedProcedure
    .input(z.object({ projectId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return db.teamArrangement.create({
        data: { projectId: input.projectId, name: input.name },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return db.teamArrangement.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.teamArrangement.delete({ where: { id: input.id } });
    }),

  clone: protectedProcedure
    .input(
      z.object({ sourceArrangementId: z.string(), name: z.string().min(1) }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const source = await tx.teamArrangement.findUniqueOrThrow({
          where: { id: input.sourceArrangementId },
          include: {
            teams: { include: { assignments: true } },
          },
        });

        const newArrangement = await tx.teamArrangement.create({
          data: { projectId: source.projectId, name: input.name },
        });

        for (const team of source.teams) {
          const newTeam = await tx.arrangementTeam.create({
            data: {
              name: team.name,
              arrangementId: newArrangement.id,
              sortOrder: team.sortOrder,
            },
          });

          if (team.assignments.length > 0) {
            await tx.arrangementAssignment.createMany({
              data: team.assignments.map((a) => ({
                arrangementTeamId: newTeam.id,
                teamMemberId: a.teamMemberId,
              })),
            });
          }
        }

        return newArrangement;
      });
    }),

  cloneFromLive: protectedProcedure
    .input(z.object({ projectId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const teams = await tx.team.findMany({
          where: { projectId: input.projectId },
          orderBy: { name: "asc" },
        });

        const members = await tx.teamMember.findMany({
          where: { projectId: input.projectId, teamId: { not: null } },
        });

        const newArrangement = await tx.teamArrangement.create({
          data: { projectId: input.projectId, name: input.name },
        });

        for (const [i, team] of teams.entries()) {
          const newTeam = await tx.arrangementTeam.create({
            data: {
              name: team.name,
              arrangementId: newArrangement.id,
              sortOrder: i,
            },
          });

          const teamMembers = members.filter((m) => m.teamId === team.id);
          if (teamMembers.length > 0) {
            await tx.arrangementAssignment.createMany({
              data: teamMembers.map((m) => ({
                arrangementTeamId: newTeam.id,
                teamMemberId: m.id,
              })),
            });
          }
        }

        return newArrangement;
      });
    }),

  activate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const arrangement = await tx.teamArrangement.findUniqueOrThrow({
          where: { id: input.id },
          include: {
            teams: {
              orderBy: { sortOrder: "asc" },
              include: { assignments: true },
            },
          },
        });

        // Deactivate all arrangements for this project
        await tx.teamArrangement.updateMany({
          where: { projectId: arrangement.projectId },
          data: { isActive: false },
        });

        // Activate this one
        await tx.teamArrangement.update({
          where: { id: input.id },
          data: { isActive: true },
        });

        // Delete all existing live Team records (cascades TeamMember.teamId to null)
        await tx.team.deleteMany({
          where: { projectId: arrangement.projectId },
        });

        // Create new live Team records from arrangement teams
        for (const arrTeam of arrangement.teams) {
          const newTeam = await tx.team.create({
            data: {
              name: arrTeam.name,
              projectId: arrangement.projectId,
            },
          });

          const memberIds = arrTeam.assignments.map((a) => a.teamMemberId);
          if (memberIds.length > 0) {
            await tx.teamMember.updateMany({
              where: { id: { in: memberIds } },
              data: { teamId: newTeam.id },
            });
          }
        }

        // Set unassigned members' teamId to null
        const allAssignedIds = arrangement.teams.flatMap((t) =>
          t.assignments.map((a) => a.teamMemberId),
        );
        await tx.teamMember.updateMany({
          where: {
            projectId: arrangement.projectId,
            id: { notIn: allAssignedIds },
          },
          data: { teamId: null },
        });
      });
    }),

  // --- Team management within arrangement ---

  addTeam: protectedProcedure
    .input(z.object({ arrangementId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const maxSort = await db.arrangementTeam.aggregate({
        where: { arrangementId: input.arrangementId },
        _max: { sortOrder: true },
      });
      return db.arrangementTeam.create({
        data: {
          name: input.name,
          arrangementId: input.arrangementId,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
      });
    }),

  updateTeam: protectedProcedure
    .input(z.object({ teamId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return db.arrangementTeam.update({
        where: { id: input.teamId },
        data: { name: input.name },
      });
    }),

  deleteTeam: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ input }) => {
      return db.arrangementTeam.delete({ where: { id: input.teamId } });
    }),

  reorderTeams: protectedProcedure
    .input(
      z.object({
        arrangementId: z.string(),
        teamIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(
        input.teamIds.map((id, index) =>
          db.arrangementTeam.update({
            where: { id },
            data: { sortOrder: index },
          }),
        ),
      );
    }),

  // --- Member assignment ---

  assignMember: protectedProcedure
    .input(
      z.object({
        arrangementTeamId: z.string(),
        teamMemberId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Remove any existing assignment for this member in the same arrangement
      const team = await db.arrangementTeam.findUniqueOrThrow({
        where: { id: input.arrangementTeamId },
      });

      await db.arrangementAssignment.deleteMany({
        where: {
          teamMemberId: input.teamMemberId,
          arrangementTeam: { arrangementId: team.arrangementId },
        },
      });

      return db.arrangementAssignment.create({
        data: {
          arrangementTeamId: input.arrangementTeamId,
          teamMemberId: input.teamMemberId,
        },
      });
    }),

  unassignMember: protectedProcedure
    .input(
      z.object({
        teamMemberId: z.string(),
        arrangementTeamId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.arrangementAssignment.deleteMany({
        where: {
          teamMemberId: input.teamMemberId,
          arrangementTeamId: input.arrangementTeamId,
        },
      });
    }),

  moveMember: protectedProcedure
    .input(
      z.object({
        teamMemberId: z.string(),
        fromTeamId: z.string(),
        toTeamId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        await tx.arrangementAssignment.deleteMany({
          where: {
            teamMemberId: input.teamMemberId,
            arrangementTeamId: input.fromTeamId,
          },
        });

        return tx.arrangementAssignment.create({
          data: {
            arrangementTeamId: input.toTeamId,
            teamMemberId: input.teamMemberId,
          },
        });
      });
    }),
});
