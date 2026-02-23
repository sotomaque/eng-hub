import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { parseGitHubUrl } from "../lib/github";
import { syncGitHubStatsForProject } from "../lib/github-sync";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const githubStatsRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const [stats, sync, teamMembers] = await Promise.all([
        db.contributorStats.findMany({
          where: { projectId: input.projectId },
          orderBy: { commits: "desc" },
        }),
        db.gitHubSync.findUnique({
          where: { projectId: input.projectId },
        }),
        db.teamMember.findMany({
          where: { projectId: input.projectId },
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                callsign: true,
                githubUsername: true,
                email: true,
                imageUrl: true,
              },
            },
          },
        }),
      ]);

      const memberMap: Record<
        string,
        {
          personId: string;
          firstName: string;
          lastName: string;
          callsign: string | null;
          imageUrl: string | null;
        }
      > = {};
      for (const tm of teamMembers) {
        const info = {
          personId: tm.person.id,
          firstName: tm.person.firstName,
          lastName: tm.person.lastName,
          callsign: tm.person.callsign,
          imageUrl: tm.person.imageUrl,
        };
        if (tm.person.githubUsername) {
          memberMap[tm.person.githubUsername] = info;
        }
        memberMap[tm.person.email] = info;
      }

      return { stats, sync, memberMap };
    }),

  getSyncStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.gitHubSync.findUnique({
        where: { projectId: input.projectId },
      });
    }),

  syncNow: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      const project = await db.project.findUnique({
        where: { id: input.projectId },
        select: { githubUrl: true },
      });

      if (!project?.githubUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Project has no GitHub URL configured.",
        });
      }

      const parsed = parseGitHubUrl(project.githubUrl);
      if (!parsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid GitHub URL format.",
        });
      }

      try {
        await syncGitHubStatsForProject(input.projectId);
        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `GitHub sync failed: ${message}`,
        });
      }
    }),
});
