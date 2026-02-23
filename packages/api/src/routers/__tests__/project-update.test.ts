import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

const mockDetectProjectCycle = mock(() => Promise.resolve(false));

mock.module("../../lib/hierarchy", () => ({
  resolveClerkPerson: mock(() => Promise.resolve("person-1")),
}));

mock.module("../../lib/roadmap-hierarchy", () => ({
  detectProjectCycle: mockDetectProjectCycle,
}));

const mockInvalidateProjectCache = mock(() => Promise.resolve());

mock.module("../../lib/cache", () => ({
  cached: mock((_key: string, _ttl: number, fn: () => unknown) => fn()),
  cacheKeys: {
    projectList: "pl",
    project: () => "p",
  },
  ttl: { projectList: 1, project: 1 },
  invalidateProjectCache: mockInvalidateProjectCache,
  invalidatePeopleCache: mock(() => Promise.resolve()),
  invalidateMgmtChain: mock(() => Promise.resolve()),
  invalidatePersonMeByIds: mock(() => Promise.resolve()),
  invalidateReferenceData: mock(() => Promise.resolve()),
  invalidateGithubStats: mock(() => Promise.resolve()),
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
  Promise.resolve({ parentId: null, fundedById: null } as {
    parentId: string | null;
    fundedById: string | null;
  } | null),
);
const mockProjectUpdate = mock(() => Promise.resolve({ id: "proj-1" }));

mock.module("@workspace/db", () => ({
  db: {
    project: {
      findUnique: mockProjectFindUnique,
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: "new-proj" })),
      update: mockProjectUpdate,
      delete: mock(() => Promise.resolve({})),
      count: mock(() => Promise.resolve(0)),
    },
    favoriteProject: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: "fav-1" })),
      delete: mock(() => Promise.resolve({})),
    },
    $transaction: mock((fn: (tx: unknown) => unknown) => fn({})),
  },
}));

// ── Import router after mocks ──────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { projectRouter } = await import("../project");

const createCaller = createCallerFactory(projectRouter);
const caller = createCaller({ userId: "test-user-id" });

const validInput = {
  id: "proj-1",
  name: "Test Project",
};

// ── Tests ──────────────────────────────────────────────────

describe("project.update", () => {
  beforeEach(() => {
    mockDetectProjectCycle.mockReset().mockResolvedValue(false);
    mockProjectFindUnique
      .mockReset()
      .mockResolvedValue({ parentId: null, fundedById: null });
    mockProjectUpdate.mockReset().mockResolvedValue({ id: "proj-1" });
    mockInvalidateProjectCache.mockReset();
  });

  test("succeeds with basic update", async () => {
    const result = await caller.update(validInput);
    expect(result).toEqual({ id: "proj-1" });
  });

  test("throws BAD_REQUEST on self-reference via parentId", async () => {
    await expect(
      caller.update({ ...validInput, parentId: "proj-1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("cannot reference itself"),
    });
  });

  test("throws BAD_REQUEST on self-reference via fundedById", async () => {
    await expect(
      caller.update({ ...validInput, fundedById: "proj-1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("cannot reference itself"),
    });
  });

  test("throws BAD_REQUEST on parent cycle detection", async () => {
    mockDetectProjectCycle.mockResolvedValue(true);

    await expect(
      caller.update({ ...validInput, parentId: "parent-1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("circular"),
    });
  });

  test("allows setting parent when no cycle exists", async () => {
    const result = await caller.update({
      ...validInput,
      parentId: "parent-1",
    });
    expect(result).toEqual({ id: "proj-1" });
    expect(mockDetectProjectCycle).toHaveBeenCalledWith("proj-1", "parent-1");
  });

  test("skips cycle detection when parentId is empty", async () => {
    await caller.update({ ...validInput, parentId: "" });
    expect(mockDetectProjectCycle).not.toHaveBeenCalled();
  });

  test("invalidates old and new parent caches", async () => {
    mockProjectFindUnique.mockResolvedValue({
      parentId: "old-parent",
      fundedById: null,
    });

    await caller.update({ ...validInput, parentId: "new-parent" });

    expect(mockInvalidateProjectCache).toHaveBeenCalledWith("proj-1");
    expect(mockInvalidateProjectCache).toHaveBeenCalledWith("old-parent");
    expect(mockInvalidateProjectCache).toHaveBeenCalledWith("new-parent");
  });

  test("invalidates fundedBy caches on change", async () => {
    mockProjectFindUnique.mockResolvedValue({
      parentId: null,
      fundedById: "old-funder",
    });

    await caller.update({ ...validInput, fundedById: "new-funder" });

    expect(mockInvalidateProjectCache).toHaveBeenCalledWith("proj-1");
    expect(mockInvalidateProjectCache).toHaveBeenCalledWith("old-funder");
    expect(mockInvalidateProjectCache).toHaveBeenCalledWith("new-funder");
  });
});
