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
                  teamMember: {
                    include: { person: true, role: true, title: true },
                  },
                },
                orderBy: { teamMember: { person: { lastName: "asc" } } },
              },
            },
          },
        },
      });

      if (!arrangement) return null;

      // Get all project members to determine unassigned ones
      const allMembers = await db.teamMember.findMany({
        where: { projectId: arrangement.projectId },
        include: { person: true, role: true, title: true },
        orderBy: { person: { lastName: "asc" } },
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

        const memberships = await tx.teamMembership.findMany({
          where: { team: { projectId: input.projectId } },
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

          const teamMemberIds = memberships
            .filter((m) => m.teamId === team.id)
            .map((m) => m.teamMemberId);
          if (teamMemberIds.length > 0) {
            await tx.arrangementAssignment.createMany({
              data: teamMemberIds.map((memberId) => ({
                arrangementTeamId: newTeam.id,
                teamMemberId: memberId,
              })),
            });
          }
        }

        return newArrangement;
      });
    }),

  ensureActiveArrangement: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const existing = await tx.teamArrangement.findFirst({
          where: { projectId: input.projectId, isActive: true },
        });
        if (existing) return existing;

        const arrangement = await tx.teamArrangement.create({
          data: {
            projectId: input.projectId,
            name: "Current Teams",
            isActive: true,
          },
        });

        const teams = await tx.team.findMany({
          where: { projectId: input.projectId },
          orderBy: { name: "asc" },
        });
        const memberships = await tx.teamMembership.findMany({
          where: { team: { projectId: input.projectId } },
        });

        for (const [i, team] of teams.entries()) {
          const arrTeam = await tx.arrangementTeam.create({
            data: {
              name: team.name,
              arrangementId: arrangement.id,
              sortOrder: i,
              liveTeamId: team.id,
            },
          });
          const teamMemberIds = memberships
            .filter((m) => m.teamId === team.id)
            .map((m) => m.teamMemberId);
          if (teamMemberIds.length > 0) {
            await tx.arrangementAssignment.createMany({
              data: teamMemberIds.map((memberId) => ({
                arrangementTeamId: arrTeam.id,
                teamMemberId: memberId,
              })),
            });
          }
        }

        return arrangement;
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

        // Clear all liveTeamId links in the project's arrangements
        const allArrTeamIds = await tx.arrangementTeam.findMany({
          where: { arrangement: { projectId: arrangement.projectId } },
          select: { id: true },
        });
        if (allArrTeamIds.length > 0) {
          await tx.arrangementTeam.updateMany({
            where: { id: { in: allArrTeamIds.map((t) => t.id) } },
            data: { liveTeamId: null },
          });
        }

        // Activate this one
        await tx.teamArrangement.update({
          where: { id: input.id },
          data: { isActive: true },
        });

        // Delete all existing live Team records (cascades TeamMembership via onDelete: Cascade)
        await tx.team.deleteMany({
          where: { projectId: arrangement.projectId },
        });

        // Create new live Team records from arrangement teams and set liveTeamId
        for (const arrTeam of arrangement.teams) {
          const newTeam = await tx.team.create({
            data: {
              name: arrTeam.name,
              projectId: arrangement.projectId,
            },
          });

          // Link the arrangement team to the new live team
          await tx.arrangementTeam.update({
            where: { id: arrTeam.id },
            data: { liveTeamId: newTeam.id },
          });

          // Create team memberships for assigned members
          const memberIds = arrTeam.assignments.map((a) => a.teamMemberId);
          if (memberIds.length > 0) {
            await tx.teamMembership.createMany({
              data: memberIds.map((memberId) => ({
                teamId: newTeam.id,
                teamMemberId: memberId,
              })),
            });
          }
        }
      });
    }),

  // --- Team management within arrangement ---

  addTeam: protectedProcedure
    .input(z.object({ arrangementId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const arrangement = await tx.teamArrangement.findUniqueOrThrow({
          where: { id: input.arrangementId },
        });

        const maxSort = await tx.arrangementTeam.aggregate({
          where: { arrangementId: input.arrangementId },
          _max: { sortOrder: true },
        });

        let liveTeamId: string | null = null;
        if (arrangement.isActive) {
          const liveTeam = await tx.team.create({
            data: { name: input.name, projectId: arrangement.projectId },
          });
          liveTeamId = liveTeam.id;
        }

        return tx.arrangementTeam.create({
          data: {
            name: input.name,
            arrangementId: input.arrangementId,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            liveTeamId,
          },
        });
      });
    }),

  updateTeam: protectedProcedure
    .input(z.object({ teamId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const arrTeam = await tx.arrangementTeam.update({
          where: { id: input.teamId },
          data: { name: input.name },
        });

        if (arrTeam.liveTeamId) {
          await tx.team.update({
            where: { id: arrTeam.liveTeamId },
            data: { name: input.name },
          });
        }

        return arrTeam;
      });
    }),

  deleteTeam: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const arrTeam = await tx.arrangementTeam.findUniqueOrThrow({
          where: { id: input.teamId },
        });

        if (arrTeam.liveTeamId) {
          await tx.team.delete({ where: { id: arrTeam.liveTeamId } });
        }

        return tx.arrangementTeam.delete({ where: { id: input.teamId } });
      });
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
      return db.$transaction(async (tx) => {
        const arrTeam = await tx.arrangementTeam.findUniqueOrThrow({
          where: { id: input.arrangementTeamId },
          include: { arrangement: true },
        });

        // Remove any existing assignment for this member in the same arrangement
        await tx.arrangementAssignment.deleteMany({
          where: {
            teamMemberId: input.teamMemberId,
            arrangementTeam: { arrangementId: arrTeam.arrangementId },
          },
        });

        const assignment = await tx.arrangementAssignment.create({
          data: {
            arrangementTeamId: input.arrangementTeamId,
            teamMemberId: input.teamMemberId,
          },
        });

        // Sync to live team if arrangement is active
        if (arrTeam.arrangement.isActive && arrTeam.liveTeamId) {
          // Remove existing memberships for this member in this project
          await tx.teamMembership.deleteMany({
            where: {
              teamMemberId: input.teamMemberId,
              team: { projectId: arrTeam.arrangement.projectId },
            },
          });
          await tx.teamMembership.create({
            data: {
              teamId: arrTeam.liveTeamId,
              teamMemberId: input.teamMemberId,
            },
          });
        }

        return assignment;
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
      return db.$transaction(async (tx) => {
        const arrTeam = await tx.arrangementTeam.findUniqueOrThrow({
          where: { id: input.arrangementTeamId },
          include: { arrangement: true },
        });

        await tx.arrangementAssignment.deleteMany({
          where: {
            teamMemberId: input.teamMemberId,
            arrangementTeamId: input.arrangementTeamId,
          },
        });

        // Sync to live team if arrangement is active
        if (arrTeam.arrangement.isActive && arrTeam.liveTeamId) {
          await tx.teamMembership.deleteMany({
            where: {
              teamMemberId: input.teamMemberId,
              teamId: arrTeam.liveTeamId,
            },
          });
        }
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

        const assignment = await tx.arrangementAssignment.create({
          data: {
            arrangementTeamId: input.toTeamId,
            teamMemberId: input.teamMemberId,
          },
        });

        // Sync to live team if arrangement is active
        const [fromArrTeam, toArrTeam] = await Promise.all([
          tx.arrangementTeam.findUniqueOrThrow({
            where: { id: input.fromTeamId },
            include: { arrangement: true },
          }),
          tx.arrangementTeam.findUniqueOrThrow({
            where: { id: input.toTeamId },
            include: { arrangement: true },
          }),
        ]);

        if (toArrTeam.arrangement.isActive) {
          // Remove membership from old live team
          if (fromArrTeam.liveTeamId) {
            await tx.teamMembership.deleteMany({
              where: {
                teamMemberId: input.teamMemberId,
                teamId: fromArrTeam.liveTeamId,
              },
            });
          }
          // Add membership to new live team
          if (toArrTeam.liveTeamId) {
            await tx.teamMembership.create({
              data: {
                teamId: toArrTeam.liveTeamId,
                teamMemberId: input.teamMemberId,
              },
            });
          }
        }

        return assignment;
      });
    }),
});
