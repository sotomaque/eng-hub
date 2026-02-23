import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

const mockParseGitHubUrl = mock(
  (_url: string) =>
    ({ owner: "owner", repo: "repo" }) as {
      owner: string;
      repo: string;
    } | null,
);

mock.module("../../lib/github", () => ({
  parseGitHubUrl: mockParseGitHubUrl,
}));

const mockSyncGitHubStatsForProject = mock(() => Promise.resolve());

mock.module("../../lib/github-sync", () => ({
  syncGitHubStatsForProject: mockSyncGitHubStatsForProject,
}));

const mockInvalidateGithubStats = mock(() => Promise.resolve());

mock.module("../../lib/cache", () => ({
  cached: mock((_key: string, _ttl: number, fn: () => unknown) => fn()),
  cacheKeys: { githubStats: () => "gs" },
  ttl: { githubStats: 1 },
  invalidateGithubStats: mockInvalidateGithubStats,
  invalidateProjectCache: mock(() => Promise.resolve()),
  invalidatePeopleCache: mock(() => Promise.resolve()),
  invalidateMgmtChain: mock(() => Promise.resolve()),
  invalidatePersonMeByIds: mock(() => Promise.resolve()),
  invalidateReferenceData: mock(() => Promise.resolve()),
  invalidateMeetingTemplates: mock(() => Promise.resolve()),
  invalidateFavoritesCache: mock(() => Promise.resolve()),
}));

mock.module("../../lib/redis", () => ({
  redis: {
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve("OK")),
    del: mock(() => Promise.resolve(1)),
  },
}));

mock.module("@upstash/ratelimit", () => ({
  Ratelimit: class {
    limit() {
      return Promise.resolve({ success: true, reset: Date.now() + 60_000 });
    }
    static slidingWindow() {
      return {};
    }
    static fixedWindow() {
      return {};
    }
  },
}));

mock.module("next/server", () => ({
  after: mock((fn: () => Promise<void>) => fn()),
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── DB mock ──────────────────────────────────────────────────

const mockProjectFindUnique = mock(() =>
  Promise.resolve({ githubUrl: "https://github.com/owner/repo" } as {
    githubUrl: string | null;
  } | null),
);

mock.module("@workspace/db", () => ({
  db: {
    project: {
      findUnique: mockProjectFindUnique,
    },
    contributorStats: {
      findMany: mock(() => Promise.resolve([])),
    },
    gitHubSync: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    teamMember: {
      findMany: mock(() => Promise.resolve([])),
    },
  },
}));

// ── Import router after mocks ──────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { githubStatsRouter } = await import("../github-stats");

const createCaller = createCallerFactory(githubStatsRouter);
const caller = createCaller({ userId: "test-user-id" });

// ── Tests ──────────────────────────────────────────────────

describe("githubStats.syncNow", () => {
  beforeEach(() => {
    mockProjectFindUnique.mockReset().mockResolvedValue({
      githubUrl: "https://github.com/owner/repo",
    });
    mockParseGitHubUrl
      .mockReset()
      .mockReturnValue({ owner: "owner", repo: "repo" });
    mockSyncGitHubStatsForProject.mockReset().mockResolvedValue(undefined);
    mockInvalidateGithubStats.mockReset();
  });

  test("throws BAD_REQUEST when project has no githubUrl", async () => {
    mockProjectFindUnique.mockResolvedValue({ githubUrl: null });

    await expect(caller.syncNow({ projectId: "proj-1" })).rejects.toMatchObject(
      {
        code: "BAD_REQUEST",
        message: expect.stringContaining("no GitHub URL"),
      },
    );
  });

  test("throws BAD_REQUEST when githubUrl is invalid", async () => {
    mockProjectFindUnique.mockResolvedValue({
      githubUrl: "not-a-github-url",
    });
    mockParseGitHubUrl.mockReturnValue(null);

    await expect(caller.syncNow({ projectId: "proj-1" })).rejects.toMatchObject(
      {
        code: "BAD_REQUEST",
        message: expect.stringContaining("Invalid GitHub URL"),
      },
    );
  });

  test("succeeds on valid sync", async () => {
    const result = await caller.syncNow({ projectId: "proj-1" });

    expect(result).toEqual({ success: true });
    expect(mockSyncGitHubStatsForProject).toHaveBeenCalledWith("proj-1");
    expect(mockInvalidateGithubStats).toHaveBeenCalledWith("proj-1");
  });

  test("throws INTERNAL_SERVER_ERROR when sync fails", async () => {
    mockSyncGitHubStatsForProject.mockRejectedValue(
      new Error("API rate limit"),
    );

    await expect(caller.syncNow({ projectId: "proj-1" })).rejects.toMatchObject(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: expect.stringContaining("API rate limit"),
      },
    );
  });
});
