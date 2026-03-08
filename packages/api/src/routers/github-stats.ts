import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";

import { type ContributorInput, compareContributors } from "../lib/git-compare";
import { parseGitHubUrl } from "../lib/github";
import { compareContributorsViaGitHub } from "../lib/github-compare";
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
                gitlabUsername: true,
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
          leftAt: string | null;
        }
      > = {};
      for (const tm of teamMembers) {
        const info = {
          personId: tm.person.id,
          firstName: tm.person.firstName,
          lastName: tm.person.lastName,
          callsign: tm.person.callsign,
          imageUrl: tm.person.imageUrl,
          leftAt: tm.leftAt?.toISOString() ?? null,
        };
        if (tm.person.githubUsername) {
          memberMap[tm.person.githubUsername] = info;
        }
        if (tm.person.gitlabUsername) {
          memberMap[tm.person.gitlabUsername] = info;
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
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `GitHub sync failed: ${message}`,
        });
      }
    }),

  compareContributors: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        personIds: z.array(z.string()).min(2),
        referencePersonId: z.string().optional(),
        repoPath: z.string().optional(),
        since: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Default since to 6 months ago
      const since =
        input.since ??
        new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Fetch person data and project in parallel
      const [people, project] = await Promise.all([
        db.person.findMany({
          where: { id: { in: input.personIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            callsign: true,
            email: true,
            emailAliases: true,
            githubUsername: true,
            gitlabUsername: true,
          },
        }),
        db.project.findUnique({
          where: { id: input.projectId },
          select: { githubUrl: true },
        }),
      ]);

      if (people.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least 2 valid people are required for comparison.",
        });
      }

      const parsed = project?.githubUrl ? parseGitHubUrl(project.githubUrl) : null;

      if (parsed) {
        const githubContributors = people.flatMap((p) =>
          p.githubUsername
            ? [
                {
                  personId: p.id,
                  name: p.callsign ?? `${p.firstName} ${p.lastName}`,
                  githubUsername: p.githubUsername,
                },
              ]
            : [],
        );

        if (githubContributors.length < 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "At least 2 selected people must have GitHub usernames set.",
          });
        }

        try {
          return await compareContributorsViaGitHub(
            parsed.owner,
            parsed.repo,
            process.env.GITHUB_TOKEN,
            githubContributors,
            since,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `GitHub comparison failed: ${message}`,
          });
        }
      }

      // Fallback: local git-compare for GitLab/local repos (dev only)
      if (process.env.NODE_ENV === "production") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Local git comparison is not available in production.",
        });
      }

      const contributors: ContributorInput[] = people.map((p) => {
        const emails = [p.email.toLowerCase(), ...p.emailAliases.map((a) => a.toLowerCase())];
        if (p.gitlabUsername) emails.push(p.gitlabUsername.toLowerCase());
        if (p.githubUsername) emails.push(p.githubUsername.toLowerCase());
        return {
          personId: p.id,
          name: p.callsign ?? `${p.firstName} ${p.lastName}`,
          emails,
        };
      });

      try {
        return compareContributors(input.repoPath, contributors, since);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Comparison failed: ${message}`,
        });
      }
    }),
});
