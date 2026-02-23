import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

const mockResolveClerkPerson = mock(() =>
  Promise.resolve("person-1" as string | null),
);

mock.module("../../lib/hierarchy", () => ({
  resolveClerkPerson: mockResolveClerkPerson,
  isInManagementChain: mock(() => Promise.resolve(false)),
  canViewMeetings: mock(() => Promise.resolve(false)),
}));

mock.module("../../lib/roadmap-hierarchy", () => ({
  detectProjectCycle: mock(() => Promise.resolve(false)),
}));

const mockInvalidateFavoritesCache = mock(() => Promise.resolve());

mock.module("../../lib/cache", () => ({
  cached: mock((_key: string, _ttl: number, fn: () => unknown) => fn()),
  cacheKeys: {
    projectList: "pl",
    project: () => "p",
    favoriteProjectIds: (id: string) => `fav:${id}`,
  },
  ttl: { projectList: 1, project: 1, favorites: 3600 },
  invalidateProjectCache: mock(() => Promise.resolve()),
  invalidatePeopleCache: mock(() => Promise.resolve()),
  invalidateMgmtChain: mock(() => Promise.resolve()),
  invalidatePersonMeByIds: mock(() => Promise.resolve()),
  invalidateReferenceData: mock(() => Promise.resolve()),
  invalidateGithubStats: mock(() => Promise.resolve()),
  invalidateMeetingTemplates: mock(() => Promise.resolve()),
  invalidateFavoritesCache: mockInvalidateFavoritesCache,
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

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

mock.module("next/server", () => ({
  after: mock((fn: () => unknown) => fn()),
}));

// ── DB mock ──────────────────────────────────────────────────

const mockFavFindMany = mock(() => Promise.resolve([]));
const mockFavFindUnique = mock(() => Promise.resolve(null));
const mockFavCreate = mock(() =>
  Promise.resolve({ id: "fav-1", personId: "person-1", projectId: "proj-1" }),
);
const mockFavDelete = mock(() => Promise.resolve({}));

mock.module("@workspace/db", () => ({
  db: {
    project: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: "new-proj" })),
      update: mock(() => Promise.resolve({ id: "proj-1" })),
      delete: mock(() => Promise.resolve({})),
      count: mock(() => Promise.resolve(0)),
    },
    favoriteProject: {
      findMany: mockFavFindMany,
      findUnique: mockFavFindUnique,
      create: mockFavCreate,
      delete: mockFavDelete,
    },
    $transaction: mock((fn: (tx: unknown) => unknown) => fn({})),
  },
}));

// ── Import router + create caller ────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { projectRouter } = await import("../project");

const createCaller = createCallerFactory(projectRouter);
const caller = createCaller({ userId: "test-user-id" });

// ── Tests ────────────────────────────────────────────────────

describe("project.myFavoriteIds", () => {
  beforeEach(() => {
    mockResolveClerkPerson.mockReset().mockResolvedValue("person-1");
    mockFavFindMany.mockReset().mockResolvedValue([]);
  });

  test("returns project IDs for the current user", async () => {
    mockFavFindMany.mockResolvedValue([
      { projectId: "proj-1" },
      { projectId: "proj-2" },
    ]);

    const result = await caller.myFavoriteIds();

    expect(result).toEqual(["proj-1", "proj-2"]);
  });

  test("returns empty array when no linked person", async () => {
    mockResolveClerkPerson.mockResolvedValue(null);

    const result = await caller.myFavoriteIds();

    expect(result).toEqual([]);
    expect(mockFavFindMany).not.toHaveBeenCalled();
  });

  test("returns empty array when user has no favorites", async () => {
    mockFavFindMany.mockResolvedValue([]);

    const result = await caller.myFavoriteIds();

    expect(result).toEqual([]);
  });
});

describe("project.isFavorited", () => {
  beforeEach(() => {
    mockResolveClerkPerson.mockReset().mockResolvedValue("person-1");
    mockFavFindUnique.mockReset().mockResolvedValue(null);
  });

  test("returns true when project is favorited", async () => {
    mockFavFindUnique.mockResolvedValue({ id: "fav-1" });

    const result = await caller.isFavorited({ projectId: "proj-1" });

    expect(result).toBe(true);
  });

  test("returns false when project is not favorited", async () => {
    const result = await caller.isFavorited({ projectId: "proj-1" });

    expect(result).toBe(false);
  });

  test("returns false when no linked person", async () => {
    mockResolveClerkPerson.mockResolvedValue(null);

    const result = await caller.isFavorited({ projectId: "proj-1" });

    expect(result).toBe(false);
    expect(mockFavFindUnique).not.toHaveBeenCalled();
  });
});

describe("project.toggleFavorite", () => {
  beforeEach(() => {
    mockResolveClerkPerson.mockReset().mockResolvedValue("person-1");
    mockFavFindUnique.mockReset().mockResolvedValue(null);
    mockFavCreate.mockReset().mockResolvedValue({
      id: "fav-1",
      personId: "person-1",
      projectId: "proj-1",
    });
    mockFavDelete.mockReset().mockResolvedValue({});
    mockInvalidateFavoritesCache.mockReset().mockResolvedValue(undefined);
  });

  test("creates favorite when not existing", async () => {
    const result = await caller.toggleFavorite({ projectId: "proj-1" });

    expect(result).toEqual({ favorited: true });
    expect(mockFavCreate).toHaveBeenCalledWith({
      data: { personId: "person-1", projectId: "proj-1" },
    });
    expect(mockFavDelete).not.toHaveBeenCalled();
  });

  test("deletes favorite when already existing", async () => {
    mockFavFindUnique.mockResolvedValue({
      id: "fav-1",
      personId: "person-1",
      projectId: "proj-1",
    });

    const result = await caller.toggleFavorite({ projectId: "proj-1" });

    expect(result).toEqual({ favorited: false });
    expect(mockFavDelete).toHaveBeenCalledWith({ where: { id: "fav-1" } });
    expect(mockFavCreate).not.toHaveBeenCalled();
  });

  test("throws BAD_REQUEST when no linked person", async () => {
    mockResolveClerkPerson.mockResolvedValue(null);

    await expect(
      caller.toggleFavorite({ projectId: "proj-1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("No linked person"),
    });
  });

  test("invalidates favorites cache after toggle", async () => {
    await caller.toggleFavorite({ projectId: "proj-1" });

    expect(mockInvalidateFavoritesCache).toHaveBeenCalledWith("person-1");
  });
});
