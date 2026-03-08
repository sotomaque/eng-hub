import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { ContributorCommitData, PRData } from "../github";

// ── Mocks ────────────────────────────────────────────────────

const mockFetchCommitStats = mock(() => Promise.resolve([] as ContributorCommitData[]));
const mockFetchPRStats = mock(() => Promise.resolve([] as PRData[]));

mock.module("../github", () => ({
  fetchCommitStats: mockFetchCommitStats,
  fetchPRStats: mockFetchPRStats,
}));

// ── Import after mocks ──────────────────────────────────────

const { compareContributorsViaGitHub } = await import("../github-compare");

// ── Helpers ─────────────────────────────────────────────────

/** Unix timestamp (seconds) for start of a given ISO week string */
function weekTs(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

function makeCommitData(
  username: string,
  weeks: { date: string; commits: number; additions: number; deletions: number }[],
): ContributorCommitData {
  const totalCommits = weeks.reduce((sum, w) => sum + w.commits, 0);
  return {
    username,
    totalCommits,
    additions: weeks.reduce((sum, w) => sum + w.additions, 0),
    deletions: weeks.reduce((sum, w) => sum + w.deletions, 0),
    weeklyData: weeks.map((w) => ({
      week: weekTs(w.date),
      commits: w.commits,
      additions: w.additions,
      deletions: w.deletions,
    })),
  };
}

function makePR(overrides: Partial<PRData> & { author: string }): PRData {
  return {
    headRefName: "feature/test",
    state: "MERGED",
    merged: true,
    mergedAt: "2025-10-15T00:00:00Z",
    createdAt: "2025-10-10T00:00:00Z",
    reviews: [],
    ...overrides,
  };
}

const CONTRIBUTORS = [
  { personId: "p1", name: "Alice", githubUsername: "alice" },
  { personId: "p2", name: "Bob", githubUsername: "bob" },
];

// ── Tests ───────────────────────────────────────────────────

beforeEach(() => {
  mockFetchCommitStats.mockReset();
  mockFetchPRStats.mockReset();
  mockFetchCommitStats.mockResolvedValue([]);
  mockFetchPRStats.mockResolvedValue([]);
});

describe("compareContributorsViaGitHub", () => {
  test("returns empty results when no commit or PR data exists", async () => {
    const result = await compareContributorsViaGitHub(
      "owner",
      "repo",
      "token",
      CONTRIBUTORS,
      "2025-01-01",
    );

    expect(result.contributors).toHaveLength(2);
    expect(result.months).toEqual([]);

    for (const c of result.contributors) {
      expect(c.totalCommits).toBe(0);
      expect(c.allTimeCommits).toBe(0);
      expect(c.additions).toBe(0);
      expect(c.deletions).toBe(0);
      expect(c.netLines).toBe(0);
      expect(c.mrsMerged).toBe(0);
      expect(c.commitTypes).toEqual([]);
      expect(c.topFiles).toEqual([]);
      expect(c.recentMRs).toEqual([]);
    }
  });

  test("aggregates commit data within since range", async () => {
    mockFetchCommitStats.mockResolvedValue([
      makeCommitData("alice", [
        { date: "2024-12-01", commits: 5, additions: 100, deletions: 20 }, // before since
        { date: "2025-02-01", commits: 10, additions: 200, deletions: 50 },
        { date: "2025-03-01", commits: 8, additions: 150, deletions: 30 },
      ]),
    ]);

    const result = await compareContributorsViaGitHub(
      "owner",
      "repo",
      "token",
      CONTRIBUTORS,
      "2025-01-01",
    );

    const alice = result.contributors.find((c) => c.personId === "p1");
    expect(alice).toBeDefined();
    expect(alice!.totalCommits).toBe(18); // 10 + 8 (excludes pre-since)
    expect(alice!.allTimeCommits).toBe(23); // all weeks
    expect(alice!.additions).toBe(350); // 200 + 150
    expect(alice!.deletions).toBe(80); // 50 + 30
    expect(alice!.netLines).toBe(270); // 350 - 80
  });

  test("tracks first and last commit dates across all time", async () => {
    mockFetchCommitStats.mockResolvedValue([
      makeCommitData("alice", [
        { date: "2024-06-01", commits: 1, additions: 10, deletions: 5 },
        { date: "2024-09-01", commits: 0, additions: 0, deletions: 0 },
        { date: "2025-03-01", commits: 3, additions: 30, deletions: 10 },
      ]),
    ]);

    const result = await compareContributorsViaGitHub(
      "owner",
      "repo",
      "token",
      CONTRIBUTORS,
      "2025-01-01",
    );

    const alice = result.contributors.find((c) => c.personId === "p1");
    expect(alice!.firstCommitDate).toBe("2024-06-01");
    expect(alice!.lastCommitDate).toBe("2025-03-01");
  });

  test("aggregates monthly commits correctly", async () => {
    mockFetchCommitStats.mockResolvedValue([
      makeCommitData("alice", [
        { date: "2025-02-03", commits: 4, additions: 40, deletions: 10 },
        { date: "2025-02-10", commits: 6, additions: 60, deletions: 20 },
        { date: "2025-03-03", commits: 3, additions: 30, deletions: 5 },
      ]),
    ]);

    const result = await compareContributorsViaGitHub(
      "owner",
      "repo",
      "token",
      CONTRIBUTORS,
      "2025-01-01",
    );

    const alice = result.contributors.find((c) => c.personId === "p1");
    expect(alice!.monthlyCommits["2025-02"]).toBe(10); // 4 + 6
    expect(alice!.monthlyCommits["2025-03"]).toBe(3);
  });

  test("counts merged PRs in range and groups by month", async () => {
    mockFetchPRStats.mockResolvedValue([
      makePR({ author: "alice", mergedAt: "2025-02-15T00:00:00Z", headRefName: "feat/one" }),
      makePR({ author: "alice", mergedAt: "2025-02-20T00:00:00Z", headRefName: "feat/two" }),
      makePR({ author: "alice", mergedAt: "2025-03-10T00:00:00Z", headRefName: "fix/three" }),
      makePR({ author: "alice", mergedAt: "2024-12-01T00:00:00Z", headRefName: "old/pr" }), // before since
      makePR({ author: "alice", merged: false, mergedAt: null, headRefName: "open/pr" }), // not merged
      makePR({ author: "bob", mergedAt: "2025-02-15T00:00:00Z", headRefName: "bob/pr" }),
    ]);

    const result = await compareContributorsViaGitHub(
      "owner",
      "repo",
      "token",
      CONTRIBUTORS,
      "2025-01-01",
    );

    const alice = result.contributors.find((c) => c.personId === "p1");
    expect(alice!.mrsMerged).toBe(3);
    expect(alice!.monthlyMRs["2025-02"]).toBe(2);
    expect(alice!.monthlyMRs["2025-03"]).toBe(1);

    const bob = result.contributors.find((c) => c.personId === "p2");
    expect(bob!.mrsMerged).toBe(1);
  });

  test("returns up to 10 most recent merged PRs sorted by date", async () => {
    const prs = Array.from({ length: 15 }, (_, i) =>
      makePR({
        author: "alice",
        mergedAt: `2025-03-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
        headRefName: `feat/pr-${i + 1}`,
      }),
    );
    mockFetchPRStats.mockResolvedValue(prs);

    const result = await compareContributorsViaGitHub(
      "owner",
      "repo",
      "token",
      CONTRIBUTORS,
      "2025-01-01",
    );

    const alice = result.contributors.find((c) => c.personId === "p1");
    expect(alice!.recentMRs).toHaveLength(10);
    // Most recent first
    expect(alice!.recentMRs[0].branch).toBe("feat/pr-15");
    expect(alice!.recentMRs[0].date).toBe("2025-03-15");
    expect(alice!.recentMRs[9].branch).toBe("feat/pr-6");
  });

  test("matches GitHub usernames case-insensitively", async () => {
    mockFetchCommitStats.mockResolvedValue([
      makeCommitData("Alice", [{ date: "2025-02-01", commits: 5, additions: 50, deletions: 10 }]),
    ]);
    mockFetchPRStats.mockResolvedValue([
      makePR({ author: "ALICE", mergedAt: "2025-02-15T00:00:00Z" }),
    ]);

    const result = await compareContributorsViaGitHub(
      "owner",
      "repo",
      "token",
      CONTRIBUTORS,
      "2025-01-01",
    );

    const alice = result.contributors.find((c) => c.personId === "p1");
    expect(alice!.totalCommits).toBe(5);
    expect(alice!.mrsMerged).toBe(1);
  });

  test("collects and sorts months from all contributors", async () => {
    mockFetchCommitStats.mockResolvedValue([
      makeCommitData("alice", [
        { date: "2025-01-06", commits: 2, additions: 20, deletions: 5 },
        { date: "2025-03-03", commits: 1, additions: 10, deletions: 2 },
      ]),
      makeCommitData("bob", [{ date: "2025-02-03", commits: 3, additions: 30, deletions: 8 }]),
    ]);

    const result = await compareContributorsViaGitHub(
      "owner",
      "repo",
      "token",
      CONTRIBUTORS,
      "2025-01-01",
    );

    expect(result.months).toEqual(["2025-01", "2025-02", "2025-03"]);
  });

  test("calls fetchCommitStats and fetchPRStats with correct params", async () => {
    await compareContributorsViaGitHub("my-org", "my-repo", "gh-token", CONTRIBUTORS, "2025-01-01");

    expect(mockFetchCommitStats).toHaveBeenCalledWith("my-org", "my-repo", "gh-token");
    expect(mockFetchPRStats).toHaveBeenCalledWith("my-org", "my-repo", "gh-token");
  });

  test("handles contributor with no matching commit data gracefully", async () => {
    mockFetchCommitStats.mockResolvedValue([
      makeCommitData("alice", [{ date: "2025-02-01", commits: 10, additions: 100, deletions: 20 }]),
      // no data for bob
    ]);

    const result = await compareContributorsViaGitHub(
      "owner",
      "repo",
      "token",
      CONTRIBUTORS,
      "2025-01-01",
    );

    const bob = result.contributors.find((c) => c.personId === "p2");
    expect(bob!.totalCommits).toBe(0);
    expect(bob!.allTimeCommits).toBe(0);
    expect(bob!.firstCommitDate).toBeNull();
    expect(bob!.lastCommitDate).toBeNull();
  });
});
