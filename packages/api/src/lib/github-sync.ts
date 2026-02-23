import { db, type StatsPeriod } from "@workspace/db";

import {
  aggregateStats,
  fetchCommitStats,
  fetchPRStats,
  parseGitHubUrl,
} from "./github";

/**
 * Run a full GitHub stats sync for a single project.
 * Extracted from the tRPC mutation so it can be called from both
 * the tRPC `syncNow` mutation and the QStash cron handler.
 */
export async function syncGitHubStatsForProject(
  projectId: string,
): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { githubUrl: true },
  });

  if (!project?.githubUrl) return;

  const parsed = parseGitHubUrl(project.githubUrl);
  if (!parsed) return;

  // Mark as syncing
  await db.gitHubSync.upsert({
    where: { projectId },
    create: { projectId, syncStatus: "syncing" },
    update: { syncStatus: "syncing", syncError: null },
  });

  try {
    const token = process.env.GITHUB_TOKEN;

    const [commitData, prData, teamMembers] = await Promise.all([
      fetchCommitStats(parsed.owner, parsed.repo, token),
      fetchPRStats(parsed.owner, parsed.repo, token),
      db.teamMember.findMany({
        where: { projectId },
        include: {
          person: { select: { githubUsername: true } },
        },
      }),
    ]);

    const teamUsernames = new Set(
      teamMembers
        .map((tm) => tm.person.githubUsername)
        .filter((u): u is string => !!u),
    );

    const { allTime, ytd } = aggregateStats(commitData, prData, teamUsernames);

    await db.$transaction(async (tx) => {
      await tx.contributorStats.deleteMany({ where: { projectId } });

      function toRecord(s: (typeof allTime)[number], period: StatsPeriod) {
        return {
          projectId,
          githubUsername: s.githubUsername,
          period,
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
        };
      }

      const records = [
        ...allTime.map((s) => toRecord(s, "all_time")),
        ...ytd.map((s) => toRecord(s, "ytd")),
      ];

      if (records.length > 0) {
        await tx.contributorStats.createMany({ data: records });
      }
    });

    await db.gitHubSync.update({
      where: { projectId },
      data: { syncStatus: "idle", lastSyncAt: new Date(), syncError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.gitHubSync.update({
      where: { projectId },
      data: { syncStatus: "error", syncError: message },
    });
    throw error;
  }
}

/**
 * Sync all projects that have a GitHub URL configured.
 * Used by the QStash cron handler.
 */
type SyncResult = {
  projectId: string | undefined;
  success: boolean;
  error?: string;
};

export async function syncAllGitHubStats(): Promise<SyncResult[]> {
  const projects = await db.project.findMany({
    where: { githubUrl: { not: null } },
    select: { id: true },
  });

  const settled = await Promise.allSettled(
    projects.map((p) => syncGitHubStatsForProject(p.id)),
  );

  return settled.map((s, i) => ({
    projectId: projects[i]?.id,
    success: s.status === "fulfilled",
    ...(s.status === "rejected" && {
      error: s.reason instanceof Error ? s.reason.message : "Unknown error",
    }),
  }));
}
