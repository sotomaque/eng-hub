import { db, type StatsPeriod } from "@workspace/db";

import { aggregateStats, fetchCommitStats, fetchPRStats, parseGitHubUrl } from "./github";

/**
 * Run a full GitHub stats sync for a single project.
 * Extracted from the tRPC mutation so it can be called from both
 * the tRPC `syncNow` mutation and the QStash cron handler.
 */
export async function syncGitHubStatsForProject(projectId: string): Promise<void> {
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

    const [commitData, prData] = await Promise.all([
      fetchCommitStats(parsed.owner, parsed.repo, token),
      fetchPRStats(parsed.owner, parsed.repo, token),
    ]);

    const commitDataAvailable = commitData.length > 0;
    const { allTime, ytd } = aggregateStats(commitData, prData);

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

    await db.$transaction(
      async (tx) => {
        if (commitDataAvailable) {
          // Full sync — delete and recreate everything
          await tx.contributorStats.deleteMany({ where: { projectId } });
          if (records.length > 0) {
            await tx.contributorStats.createMany({ data: records });
          }
        } else if (records.length > 0) {
          // Partial sync — commit data unavailable (GitHub 202).
          // Only update PR/review fields; preserve existing commit data.
          for (const record of records) {
            await tx.contributorStats.upsert({
              where: {
                projectId_githubUsername_period: {
                  projectId: record.projectId,
                  githubUsername: record.githubUsername,
                  period: record.period,
                },
              },
              update: {
                prsOpened: record.prsOpened,
                prsMerged: record.prsMerged,
                reviewsDone: record.reviewsDone,
                avgWeeklyReviews: record.avgWeeklyReviews,
                recentWeeklyReviews: record.recentWeeklyReviews,
                reviewTrend: record.reviewTrend,
              },
              create: record,
            });
          }
        }
      },
      { timeout: 30000 },
    );

    // Store individual merged PRs for the merge digest (batch insert)
    const mergedPRs = prData.filter((pr) => pr.merged && pr.mergedAt);
    if (mergedPRs.length > 0) {
      await db.mergeEntry.createMany({
        data: mergedPRs.map((pr) => ({
          projectId,
          title: pr.title,
          authorUsername: pr.author,
          mergedAt: new Date(pr.mergedAt as string),
          url: pr.url,
        })),
        skipDuplicates: true,
      });
    }

    const syncWarning = commitDataAvailable
      ? null
      : "Commit stats temporarily unavailable from GitHub. PR/review data updated. Try syncing again in a few minutes.";

    await db.gitHubSync.update({
      where: { projectId },
      data: {
        syncStatus: "idle",
        lastSyncAt: new Date(),
        syncError: syncWarning,
      },
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

  const settled = await Promise.allSettled(projects.map((p) => syncGitHubStatsForProject(p.id)));

  return settled.map((s, i) => ({
    projectId: projects[i]?.id,
    success: s.status === "fulfilled",
    ...(s.status === "rejected" && {
      error: s.reason instanceof Error ? s.reason.message : "Unknown error",
    }),
  }));
}
