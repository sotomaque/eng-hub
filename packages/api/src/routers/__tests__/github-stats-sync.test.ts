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
