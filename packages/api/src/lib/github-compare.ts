/**
 * GitHub API-based contributor comparison.
 *
 * Uses the GitHub REST and GraphQL APIs (fetchCommitStats + fetchPRStats)
 * to build the same CompareResult shape as git-compare.ts, without
 * requiring a local repo clone.
 */

import type { CompareResult, ContributorCompareResult } from "./git-compare";
import type { ContributorCommitData, PRData } from "./github";
import { fetchCommitStats, fetchPRStats } from "./github";

export type GitHubContributorInput = {
  personId: string;
  name: string;
  githubUsername: string;
};

function toMonthKey(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toMonthKeyFromISO(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

function buildContributorResult(
  input: GitHubContributorInput,
  commitData: ContributorCommitData | undefined,
  authorPRs: PRData[],
  sinceDate: Date,
): ContributorCompareResult {
  const sinceUnix = sinceDate.getTime() / 1000;
  const sinceISO = sinceDate.toISOString();

  // Commit metrics from weekly data
  let totalCommits = 0;
  let additions = 0;
  let deletions = 0;
  let firstCommitDate: string | null = null;
  let lastCommitDate: string | null = null;
  const monthlyCommits: Record<string, number> = {};

  if (commitData) {
    for (const w of commitData.weeklyData) {
      // Track first/last commit across all time
      if (w.commits > 0) {
        const weekDate = new Date(w.week * 1000).toISOString().slice(0, 10);
        if (!firstCommitDate) firstCommitDate = weekDate;
        lastCommitDate = weekDate;
      }

      // Only count metrics within the since range
      if (w.week >= sinceUnix) {
        totalCommits += w.commits;
        additions += w.additions;
        deletions += w.deletions;

        if (w.commits > 0) {
          const key = toMonthKey(w.week);
          monthlyCommits[key] = (monthlyCommits[key] ?? 0) + w.commits;
        }
      }
    }
  }

  // PR metrics — filter to this contributor's merged PRs in range
  const mergedInRange = authorPRs.filter(
    (pr) => pr.merged && pr.mergedAt && pr.mergedAt >= sinceISO,
  );

  const monthlyMRs: Record<string, number> = {};
  for (const pr of mergedInRange) {
    if (pr.mergedAt) {
      const key = toMonthKeyFromISO(pr.mergedAt);
      monthlyMRs[key] = (monthlyMRs[key] ?? 0) + 1;
    }
  }

  // Recent MRs — 10 most recent merged PRs (in range)
  const recentMRs = mergedInRange
    .sort((a, b) => (b.mergedAt ?? "").localeCompare(a.mergedAt ?? ""))
    .slice(0, 10)
    .map((pr) => ({
      branch: pr.headRefName,
      date: pr.mergedAt?.slice(0, 10) ?? "",
    }));

  return {
    personId: input.personId,
    name: input.name,
    totalCommits,
    allTimeCommits: commitData?.totalCommits ?? 0,
    firstCommitDate,
    lastCommitDate,
    additions,
    deletions,
    netLines: additions - deletions,
    mrsMerged: mergedInRange.length,
    monthlyCommits,
    monthlyMRs,
    commitTypes: [],
    topFiles: [],
    recentMRs,
  };
}

export async function compareContributorsViaGitHub(
  owner: string,
  repo: string,
  token: string | undefined,
  contributors: GitHubContributorInput[],
  since: string,
): Promise<CompareResult> {
  const [commitStats, prStats] = await Promise.all([
    fetchCommitStats(owner, repo, token),
    fetchPRStats(owner, repo, token),
  ]);

  const sinceDate = new Date(since);

  // Build lookup maps by lowercase username
  const commitMap = new Map<string, ContributorCommitData>();
  for (const c of commitStats) {
    commitMap.set(c.username.toLowerCase(), c);
  }

  const prsByAuthor = new Map<string, PRData[]>();
  for (const pr of prStats) {
    const key = pr.author.toLowerCase();
    const list = prsByAuthor.get(key);
    if (list) list.push(pr);
    else prsByAuthor.set(key, [pr]);
  }

  const results: ContributorCompareResult[] = contributors.map((input) => {
    const lowerUsername = input.githubUsername.toLowerCase();
    const commitData = commitMap.get(lowerUsername);
    const authorPRs = prsByAuthor.get(lowerUsername) ?? [];
    return buildContributorResult(input, commitData, authorPRs, sinceDate);
  });

  // Collect all months across all contributors
  const monthSet = new Set<string>();
  for (const r of results) {
    for (const m of Object.keys(r.monthlyCommits)) monthSet.add(m);
    for (const m of Object.keys(r.monthlyMRs)) monthSet.add(m);
  }
  const months = [...monthSet].sort();

  return { contributors: results, months };
}
