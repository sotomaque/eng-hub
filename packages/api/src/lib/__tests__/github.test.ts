import { describe, expect, test } from "bun:test";
import { aggregateStats, type ContributorCommitData, type PRData, parseGitHubUrl } from "../github";

// ── parseGitHubUrl ──────────────────────────────────────────

describe("parseGitHubUrl", () => {
  test("parses standard URL", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  test("strips .git suffix", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo.git");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  test("handles trailing slash", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  test("returns null for non-GitHub URL", () => {
    expect(parseGitHubUrl("https://gitlab.com/owner/repo")).toBeNull();
  });

  test("returns null for malformed URL (no repo)", () => {
    expect(parseGitHubUrl("https://github.com/owner")).toBeNull();
  });

  test("returns null for invalid URL string", () => {
    expect(parseGitHubUrl("not-a-url")).toBeNull();
  });
});

// ── aggregateStats ──────────────────────────────────────────

// Helper: week timestamp in seconds (GitHub API format)
function weekTs(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

describe("aggregateStats", () => {
  test("returns empty arrays when no data", () => {
    const result = aggregateStats([], [], new Set());
    expect(result.allTime).toEqual([]);
    expect(result.ytd).toEqual([]);
  });

  test("aggregates single contributor commits", () => {
    const commits: ContributorCommitData[] = [
      {
        username: "alice",
        totalCommits: 10,
        additions: 500,
        deletions: 100,
        weeklyData: [
          {
            week: weekTs(new Date("2025-01-06")),
            additions: 250,
            deletions: 50,
            commits: 5,
          },
          {
            week: weekTs(new Date("2025-01-13")),
            additions: 250,
            deletions: 50,
            commits: 5,
          },
        ],
      },
    ];
    const result = aggregateStats(commits, [], new Set(["alice"]));

    expect(result.allTime).toHaveLength(1);
    const alice = result.allTime[0];
    expect(alice?.commits).toBe(10);
    expect(alice?.additions).toBe(500);
    expect(alice?.deletions).toBe(100);
  });

  test("filters by teamUsernames (excludes non-team members)", () => {
    const commits: ContributorCommitData[] = [
      {
        username: "alice",
        totalCommits: 10,
        additions: 100,
        deletions: 10,
        weeklyData: [],
      },
      {
        username: "bob",
        totalCommits: 20,
        additions: 200,
        deletions: 20,
        weeklyData: [],
      },
    ];
    const result = aggregateStats(commits, [], new Set(["alice"]));

    expect(result.allTime).toHaveLength(1);
    expect(result.allTime[0]?.githubUsername).toBe("alice");
  });

  test("calculates all-time trend: up when recent >= avg * 1.2", () => {
    // 20 weeks: first 12 weeks 1 commit each, last 8 weeks 10 commits each
    // avg = 92/20 = 4.6, recent (last 8) = 80/8 = 10, 10 >= 4.6*1.2=5.52 → "up"
    const weeklyData = Array.from({ length: 20 }, (_, i) => ({
      week: weekTs(new Date(2025, 0, 6 + i * 7)),
      additions: 10,
      deletions: 1,
      commits: i >= 12 ? 10 : 1,
    }));
    const totalCommits = weeklyData.reduce((s, w) => s + w.commits, 0);

    const commits: ContributorCommitData[] = [
      {
        username: "alice",
        totalCommits: totalCommits,
        additions: 100,
        deletions: 10,
        weeklyData,
      },
    ];
    const result = aggregateStats(commits, [], new Set(["alice"]));
    expect(result.allTime[0]?.trend).toBe("up");
  });

  test("calculates all-time trend: down when recent <= avg * 0.8", () => {
    // 20 weeks: first 12 weeks 10 commits each, last 8 weeks 1 commit each
    // avg = 128/20 = 6.4, recent (last 8) = 8/8 = 1, 1 <= 6.4*0.8=5.12 → "down"
    const weeklyData = Array.from({ length: 20 }, (_, i) => ({
      week: weekTs(new Date(2025, 0, 6 + i * 7)),
      additions: 10,
      deletions: 1,
      commits: i >= 12 ? 1 : 10,
    }));
    const totalCommits = weeklyData.reduce((s, w) => s + w.commits, 0);

    const commits: ContributorCommitData[] = [
      {
        username: "alice",
        totalCommits: totalCommits,
        additions: 100,
        deletions: 10,
        weeklyData,
      },
    ];
    const result = aggregateStats(commits, [], new Set(["alice"]));
    expect(result.allTime[0]?.trend).toBe("down");
  });

  test("calculates all-time trend: stable in between", () => {
    // All weeks same commits
    const weeklyData = Array.from({ length: 10 }, (_, i) => ({
      week: weekTs(new Date(2025, 0, 6 + i * 7)),
      additions: 10,
      deletions: 1,
      commits: 5,
    }));

    const commits: ContributorCommitData[] = [
      {
        username: "alice",
        totalCommits: 50,
        additions: 100,
        deletions: 10,
        weeklyData,
      },
    ];
    const result = aggregateStats(commits, [], new Set(["alice"]));
    expect(result.allTime[0]?.trend).toBe("stable");
  });

  test("trend is up when avg is 0 but recent > 0", () => {
    // Most weeks 0 commits, last week has commits
    const weeklyData = Array.from({ length: 10 }, (_, i) => ({
      week: weekTs(new Date(2025, 0, 6 + i * 7)),
      additions: 0,
      deletions: 0,
      commits: i === 9 ? 5 : 0,
    }));

    const commits: ContributorCommitData[] = [
      {
        username: "alice",
        totalCommits: 5,
        additions: 0,
        deletions: 0,
        weeklyData,
      },
    ];
    const result = aggregateStats(commits, [], new Set(["alice"]));
    // avg = 5/10 = 0.5, recent (last 8) = 5/8 = 0.625
    // recent >= avg * 1.2 → 0.625 >= 0.6 → true → "up"
    expect(result.allTime[0]?.trend).toBe("up");
  });

  test("counts PRs opened and merged per contributor", () => {
    const prs: PRData[] = [
      {
        author: "alice",
        state: "MERGED",
        merged: true,
        mergedAt: "2025-03-01T00:00:00Z",
        createdAt: "2025-02-28T00:00:00Z",
        reviews: [],
      },
      {
        author: "alice",
        state: "OPEN",
        merged: false,
        mergedAt: null,
        createdAt: "2025-03-02T00:00:00Z",
        reviews: [],
      },
    ];
    const result = aggregateStats([], prs, new Set(["alice"]));

    expect(result.allTime[0]?.prsOpened).toBe(2);
    expect(result.allTime[0]?.prsMerged).toBe(1);
  });

  test("deduplicates reviews (one review per reviewer per PR)", () => {
    const prs: PRData[] = [
      {
        author: "alice",
        state: "MERGED",
        merged: true,
        mergedAt: "2025-03-01T00:00:00Z",
        createdAt: "2025-02-28T00:00:00Z",
        reviews: [
          // bob reviews twice on same PR — should count as 1
          { login: "bob", createdAt: "2025-02-28T01:00:00Z" },
          { login: "bob", createdAt: "2025-02-28T02:00:00Z" },
          { login: "charlie", createdAt: "2025-02-28T03:00:00Z" },
        ],
      },
    ];
    const result = aggregateStats([], prs, new Set(["alice", "bob", "charlie"]));

    const bob = result.allTime.find((c) => c.githubUsername === "bob");
    const charlie = result.allTime.find((c) => c.githubUsername === "charlie");
    expect(bob?.reviewsDone).toBe(1);
    expect(charlie?.reviewsDone).toBe(1);
  });

  test("excludes non-team reviewers", () => {
    const prs: PRData[] = [
      {
        author: "alice",
        state: "MERGED",
        merged: true,
        mergedAt: "2025-03-01T00:00:00Z",
        createdAt: "2025-02-28T00:00:00Z",
        reviews: [{ login: "external-user", createdAt: "2025-02-28T01:00:00Z" }],
      },
    ];
    const result = aggregateStats([], prs, new Set(["alice"]));

    // external-user is not in teamUsernames, should not appear
    const external = result.allTime.find((c) => c.githubUsername === "external-user");
    expect(external).toBeUndefined();
  });

  test("YTD only includes data from current year", () => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const commits: ContributorCommitData[] = [
      {
        username: "alice",
        totalCommits: 20,
        additions: 200,
        deletions: 20,
        weeklyData: [
          // Last year week
          {
            week: weekTs(new Date(lastYear, 6, 1)),
            additions: 100,
            deletions: 10,
            commits: 10,
          },
          // This year week
          {
            week: weekTs(new Date(currentYear, 1, 1)),
            additions: 100,
            deletions: 10,
            commits: 10,
          },
        ],
      },
    ];
    const result = aggregateStats(commits, [], new Set(["alice"]));

    // allTime should have 20 total commits
    expect(result.allTime[0]?.commits).toBe(20);
    // YTD should only count this year's commits
    expect(result.ytd[0]?.commits).toBe(10);
  });
});
