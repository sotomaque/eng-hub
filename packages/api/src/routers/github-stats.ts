import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import {
  aggregateStats,
  fetchCommitStats,
  fetchPRStats,
  parseGitHubUrl,
} from "../lib/github";
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

      // Build a map of githubUsername -> person info
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
        // Also index by email so GitLab-seeded stats (keyed by email) resolve
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

      // Mark as syncing
      await db.gitHubSync.upsert({
        where: { projectId: input.projectId },
        create: {
          projectId: input.projectId,
          syncStatus: "syncing",
        },
        update: {
          syncStatus: "syncing",
          syncError: null,
        },
      });

      try {
        const token = process.env.GITHUB_TOKEN;

        // Fetch data from GitHub
        const [commitData, prData] = await Promise.all([
          fetchCommitStats(parsed.owner, parsed.repo, token),
          fetchPRStats(parsed.owner, parsed.repo, token),
        ]);

        // Get team members' GitHub usernames
        const teamMembers = await db.teamMember.findMany({
          where: { projectId: input.projectId },
          include: {
            person: { select: { githubUsername: true } },
          },
        });

        const teamUsernames = new Set(
          teamMembers
            .map((tm) => tm.person.githubUsername)
            .filter((u): u is string => !!u),
        );

        // Aggregate stats
        const { allTime, ytd } = aggregateStats(
          commitData,
          prData,
          teamUsernames,
        );

        // Upsert stats in a transaction
        await db.$transaction(async (tx) => {
          // Delete old stats for this project
          await tx.contributorStats.deleteMany({
            where: { projectId: input.projectId },
          });

          // Insert new stats
          const records = [
            ...allTime.map((s) => ({
              projectId: input.projectId,
              githubUsername: s.githubUsername,
              period: "all_time" as const,
              commits: s.commits,
              prsOpened: s.prsOpened,
              prsMerged: s.prsMerged,
              reviewsDone: s.reviewsDone,
              additions: s.additions,
              deletions: s.deletions,
              avgWeeklyCommits: s.avgWeeklyCommits,
              recentWeeklyCommits: s.recentWeeklyCommits,
              trend: s.trend,
              avgWeeklyReviews: s.avgWeeklyReviews,
              recentWeeklyReviews: s.recentWeeklyReviews,
              reviewTrend: s.reviewTrend,
            })),
            ...ytd.map((s) => ({
              projectId: input.projectId,
              githubUsername: s.githubUsername,
              period: "ytd" as const,
              commits: s.commits,
              prsOpened: s.prsOpened,
              prsMerged: s.prsMerged,
              reviewsDone: s.reviewsDone,
              additions: s.additions,
              deletions: s.deletions,
              avgWeeklyCommits: s.avgWeeklyCommits,
              recentWeeklyCommits: s.recentWeeklyCommits,
              trend: s.trend,
              avgWeeklyReviews: s.avgWeeklyReviews,
              recentWeeklyReviews: s.recentWeeklyReviews,
              reviewTrend: s.reviewTrend,
            })),
          ];

          if (records.length > 0) {
            await tx.contributorStats.createMany({ data: records });
          }
        });

        // Mark sync as complete
        await db.gitHubSync.update({
          where: { projectId: input.projectId },
          data: {
            syncStatus: "idle",
            lastSyncAt: new Date(),
            syncError: null,
          },
        });

        return { success: true };
      } catch (error) {
        // Mark sync as errored
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await db.gitHubSync.update({
          where: { projectId: input.projectId },
          data: {
            syncStatus: "error",
            syncError: message,
          },
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `GitHub sync failed: ${message}`,
        });
      }
    }),
});
