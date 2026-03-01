import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const arrangementRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
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

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const arrangement = await db.teamArrangement.findUnique({
      where: { id: input.id },
      include: {
        teams: {
          orderBy: { sortOrder: "asc" },
          include: {
            assignments: {
              include: {
                teamMember: {
                  include: {
                    person: {
                      include: {
                        department: true,
                        title: { include: { department: true } },
                      },
                    },
                  },
                },
              },
              orderBy: { teamMember: { person: { lastName: "asc" } } },
            },
          },
        },
      },
    });

    if (!arrangement) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Arrangement not found",
      });
    }

    // Get all project members to determine unassigned ones
    const allMembers = await db.teamMember.findMany({
      where: { projectId: arrangement.projectId, leftAt: null },
      include: {
        person: {
          include: {
            department: true,
            title: { include: { department: true } },
          },
        },
      },
      orderBy: { person: { lastName: "asc" } },
    });

    const assignedMemberIds = new Set(
      arrangement.teams.flatMap((t) => t.assignments.map((a) => a.teamMemberId)),
    );

    const unassignedMembers = allMembers.filter((m) => !assignedMemberIds.has(m.id));

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

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    return db.teamArrangement.delete({ where: { id: input.id } });
  }),

  clone: protectedProcedure
    .input(z.object({ sourceArrangementId: z.string(), name: z.string().min(1) }))
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

        // Batch-create all teams in one query
        const newTeams = await tx.arrangementTeam.createManyAndReturn({
          data: source.teams.map((team) => ({
            name: team.name,
            arrangementId: newArrangement.id,
            sortOrder: team.sortOrder,
          })),
        });

        // Batch-create all assignments in one query
        const allAssignments = source.teams.flatMap((team, i) => {
          const newTeamId = newTeams[i]?.id;
          if (!newTeamId) return [];
          return team.assignments.map((a) => ({
            arrangementTeamId: newTeamId,
            teamMemberId: a.teamMemberId,
          }));
        });
        if (allAssignments.length > 0) {
          await tx.arrangementAssignment.createMany({ data: allAssignments });
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

        // Batch-create all teams in one query
        const newTeams = await tx.arrangementTeam.createManyAndReturn({
          data: teams.map((team, i) => ({
            name: team.name,
            arrangementId: newArrangement.id,
            sortOrder: i,
          })),
        });

        // Build a map from old team ID → new arrangement team ID
        const teamIdMap = new Map(
          teams.flatMap((team, i) => {
            const newId = newTeams[i]?.id;
            return newId ? [[team.id, newId] as const] : [];
          }),
        );

        // Batch-create all assignments in one query
        const allAssignments = memberships
          .filter((m) => teamIdMap.has(m.teamId))
          .map((m) => ({
            arrangementTeamId: teamIdMap.get(m.teamId) as string,
            teamMemberId: m.teamMemberId,
          }));
        if (allAssignments.length > 0) {
          await tx.arrangementAssignment.createMany({ data: allAssignments });
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

        const [arrangement, teams, memberships] = await Promise.all([
          tx.teamArrangement.create({
            data: {
              projectId: input.projectId,
              name: "Current Teams",
              isActive: true,
            },
          }),
          tx.team.findMany({
            where: { projectId: input.projectId },
            orderBy: { name: "asc" },
          }),
          tx.teamMembership.findMany({
            where: { team: { projectId: input.projectId } },
          }),
        ]);

        // Batch-create all arrangement teams in one query
        const arrTeams = await tx.arrangementTeam.createManyAndReturn({
          data: teams.map((team, i) => ({
            name: team.name,
            arrangementId: arrangement.id,
            sortOrder: i,
            liveTeamId: team.id,
          })),
        });

        // Build a map from live team ID → arrangement team ID
        const teamIdMap = new Map(
          teams.flatMap((team, i) => {
            const newId = arrTeams[i]?.id;
            return newId ? [[team.id, newId] as const] : [];
          }),
        );

        // Batch-create all assignments in one query
        const allAssignments = memberships
          .filter((m) => teamIdMap.has(m.teamId))
          .map((m) => ({
            arrangementTeamId: teamIdMap.get(m.teamId) as string,
            teamMemberId: m.teamMemberId,
          }));
        if (allAssignments.length > 0) {
          await tx.arrangementAssignment.createMany({ data: allAssignments });
        }

        return arrangement;
      });
    }),

  activate: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db.$transaction(async (tx) => {
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

      // Batch-create all new live Team records in one query
      const newTeams = await tx.team.createManyAndReturn({
        data: arrangement.teams.map((arrTeam) => ({
          name: arrTeam.name,
          projectId: arrangement.projectId,
        })),
      });

      // Batch-update arrangement teams to link to new live teams
      await Promise.all(
        arrangement.teams.flatMap((arrTeam, i) => {
          const newTeamId = newTeams[i]?.id;
          if (!newTeamId) return [];
          return [
            tx.arrangementTeam.update({
              where: { id: arrTeam.id },
              data: { liveTeamId: newTeamId },
            }),
          ];
        }),
      );

      // Batch-create all team memberships in one query
      const allMemberships = arrangement.teams.flatMap((arrTeam, i) => {
        const newTeamId = newTeams[i]?.id;
        if (!newTeamId) return [];
        return arrTeam.assignments.map((a) => ({
          teamId: newTeamId,
          teamMemberId: a.teamMemberId,
        }));
      });
      if (allMemberships.length > 0) {
        await tx.teamMembership.createMany({ data: allMemberships });
      }

      return arrangement.projectId;
    });
  }),

  // --- Team management within arrangement ---

  addTeam: protectedProcedure
    .input(z.object({ arrangementId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const result = await db.$transaction(async (tx) => {
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

        const arrTeam = await tx.arrangementTeam.create({
          data: {
            name: input.name,
            arrangementId: input.arrangementId,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            liveTeamId,
          },
        });
        return {
          arrTeam,
          projectId: arrangement.projectId,
          isActive: arrangement.isActive,
        };
      });
      return result.arrTeam;
    }),

  updateTeam: protectedProcedure
    .input(z.object({ teamId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const result = await db.$transaction(async (tx) => {
        const arrTeam = await tx.arrangementTeam.update({
          where: { id: input.teamId },
          data: { name: input.name },
          include: { arrangement: { select: { projectId: true } } },
        });

        if (arrTeam.liveTeamId) {
          await tx.team.update({
            where: { id: arrTeam.liveTeamId },
            data: { name: input.name },
          });
        }

        return {
          arrTeam,
          touchedLive: !!arrTeam.liveTeamId,
          projectId: arrTeam.arrangement.projectId,
        };
      });
      return result.arrTeam;
    }),

  deleteTeam: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ input }) => {
      await db.$transaction(async (tx) => {
        const arrTeam = await tx.arrangementTeam.findUniqueOrThrow({
          where: { id: input.teamId },
        });

        if (arrTeam.liveTeamId) {
          await tx.team.delete({ where: { id: arrTeam.liveTeamId } });
        }

        await tx.arrangementTeam.delete({ where: { id: input.teamId } });
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
      const result = await db.$transaction(async (tx) => {
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

        const touchedLive = arrTeam.arrangement.isActive && !!arrTeam.liveTeamId;

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

        return {
          assignment,
          touchedLive,
          projectId: arrTeam.arrangement.projectId,
        };
      });
      return result.assignment;
    }),

  unassignMember: protectedProcedure
    .input(
      z.object({
        teamMemberId: z.string(),
        arrangementTeamId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.$transaction(async (tx) => {
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
      const result = await db.$transaction(async (tx) => {
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

        const touchedLive = toArrTeam.arrangement.isActive;

        if (touchedLive) {
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

        return {
          assignment,
          touchedLive,
          projectId: toArrTeam.arrangement.projectId,
        };
      });
      return result.assignment;
    }),
});
