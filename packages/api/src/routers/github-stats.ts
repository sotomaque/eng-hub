import { createAnthropic } from "@ai-sdk/anthropic";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { generateText } from "ai";
import { z } from "zod";
import { CAPABILITIES } from "../lib/capabilities";
import { type ContributorInput, compareContributors } from "../lib/git-compare";
import { parseGitHubUrl } from "../lib/github";
import { compareContributorsViaGitHub } from "../lib/github-compare";
import { syncGitHubStatsForProject } from "../lib/github-sync";
import { createTRPCRouter, protectedProcedure, requireCapability } from "../trpc";

const MERGE_SUMMARY_PROMPT = `You are a weekly merge digest generator for a software team. Given a list of merged PRs/commits with titles and authors, generate a concise summary in markdown with these sections:

## This Period — Merge Summary
One-line: "{count} pull requests/commits merged across {n} contributors."

## By Contributor
Bullet list of each contributor and their merge count, sorted by count descending. Use display names when available, fall back to usernames.

## Highlights by Area
Group merges into 3-5 categories based on the titles (e.g. UI/UX, Data/backend, Infra/tooling, Tests, Bug fixes). List a few representative titles per category.

## Top Contributor
2-3 sentences about who led output, what areas they worked on, and any notable patterns from other top contributors.

Keep it factual and concise. Do not invent details not present in the data.`;

export const githubStatsRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_STATS_READ))
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
                hireDate: true,
                title: { select: { name: true } },
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
          isTeamMember: boolean;
          title: string | null;
          hireDate: string | null;
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
          isTeamMember: true,
          title: tm.person.title?.name ?? null,
          hireDate: tm.person.hireDate?.toISOString() ?? null,
        };
        if (tm.person.githubUsername) {
          memberMap[tm.person.githubUsername] = info;
        }
        if (tm.person.gitlabUsername) {
          memberMap[tm.person.gitlabUsername] = info;
        }
        memberMap[tm.person.email] = info;
      }

      // Look up Person records for contributors not on the team
      const unmatchedUsernames = stats.map((s) => s.githubUsername).filter((u) => !memberMap[u]);

      if (unmatchedUsernames.length > 0) {
        const matchedPeople = await db.person.findMany({
          where: { githubUsername: { in: unmatchedUsernames }, leftAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            callsign: true,
            githubUsername: true,
            imageUrl: true,
            hireDate: true,
            title: { select: { name: true } },
          },
        });
        for (const p of matchedPeople) {
          if (p.githubUsername) {
            memberMap[p.githubUsername] = {
              personId: p.id,
              firstName: p.firstName,
              lastName: p.lastName,
              callsign: p.callsign,
              imageUrl: p.imageUrl,
              leftAt: null,
              isTeamMember: false,
              title: p.title?.name ?? null,
              hireDate: p.hireDate?.toISOString() ?? null,
            };
          }
        }
      }

      return { stats, sync, memberMap };
    }),

  getSyncStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_STATS_READ))
    .query(async ({ input }) => {
      return db.gitHubSync.findUnique({
        where: { projectId: input.projectId },
      });
    }),

  syncNow: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_STATS_READ))
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
    .use(requireCapability(CAPABILITIES.PROJECT_STATS_READ))
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

  getMergeDigest: protectedProcedure
    .input(z.object({ projectId: z.string(), days: z.enum(["7", "14", "30"]) }))
    .use(requireCapability(CAPABILITIES.PROJECT_STATS_READ))
    .query(async ({ input }) => {
      const since = new Date(Date.now() - Number(input.days) * 24 * 60 * 60 * 1000);
      const entries = await db.mergeEntry.findMany({
        where: { projectId: input.projectId, mergedAt: { gte: since } },
        orderBy: { mergedAt: "desc" },
      });

      const byContributor = new Map<string, number>();
      for (const entry of entries) {
        byContributor.set(entry.authorUsername, (byContributor.get(entry.authorUsername) ?? 0) + 1);
      }

      return {
        entries,
        byContributor: Object.fromEntries([...byContributor.entries()].sort((a, b) => b[1] - a[1])),
        total: entries.length,
      };
    }),

  getMergeSummary: protectedProcedure
    .input(z.object({ projectId: z.string(), days: z.enum(["7", "14", "30"]) }))
    .use(requireCapability(CAPABILITIES.PROJECT_STATS_READ))
    .query(async ({ input }) => {
      return db.mergeSummary.findUnique({
        where: {
          projectId_periodDays: {
            projectId: input.projectId,
            periodDays: Number(input.days),
          },
        },
      });
    }),

  generateMergeSummary: protectedProcedure
    .input(z.object({ projectId: z.string(), days: z.enum(["7", "14", "30"]) }))
    .use(requireCapability(CAPABILITIES.PROJECT_STATS_READ))
    .mutation(async ({ input }) => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "ANTHROPIC_API_KEY is not configured.",
        });
      }

      const since = new Date(Date.now() - Number(input.days) * 24 * 60 * 60 * 1000);
      const entries = await db.mergeEntry.findMany({
        where: { projectId: input.projectId, mergedAt: { gte: since } },
        orderBy: { mergedAt: "desc" },
      });

      if (entries.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No merge entries found for this period. Sync first.",
        });
      }

      // Resolve usernames to display names via team members
      const teamMembers = await db.teamMember.findMany({
        where: { projectId: input.projectId },
        include: {
          person: {
            select: {
              firstName: true,
              lastName: true,
              callsign: true,
              githubUsername: true,
              gitlabUsername: true,
            },
          },
        },
      });

      const usernameToName = new Map<string, string>();
      for (const tm of teamMembers) {
        const displayName = tm.person.callsign ?? `${tm.person.firstName} ${tm.person.lastName}`;
        if (tm.person.githubUsername) usernameToName.set(tm.person.githubUsername, displayName);
        if (tm.person.gitlabUsername) usernameToName.set(tm.person.gitlabUsername, displayName);
      }

      const mergeList = entries.map((e) => {
        const name = usernameToName.get(e.authorUsername) ?? e.authorUsername;
        return `- ${e.title} — ${name}`;
      });

      const anthropic = createAnthropic({ apiKey });
      const result = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        system: MERGE_SUMMARY_PROMPT,
        prompt: `Here are the ${entries.length} merges from the last ${input.days} days:\n\n${mergeList.join("\n")}`,
      });

      const summary = await db.mergeSummary.upsert({
        where: {
          projectId_periodDays: {
            projectId: input.projectId,
            periodDays: Number(input.days),
          },
        },
        update: {
          summary: result.text,
          mergeCount: entries.length,
          generatedAt: new Date(),
        },
        create: {
          projectId: input.projectId,
          periodDays: Number(input.days),
          summary: result.text,
          mergeCount: entries.length,
          generatedAt: new Date(),
        },
      });

      return summary;
    }),
});
