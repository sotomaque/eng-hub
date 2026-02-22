import { beforeEach, describe, expect, mock, test } from "bun:test";

const mockGet = mock(() => Promise.resolve(null));
const mockSet = mock(() => Promise.resolve("OK"));
const mockDel = mock(() => Promise.resolve(1));
const mockFindMany = mock(() => Promise.resolve([]));

mock.module("../redis", () => ({
  redis: {
    get: mockGet,
    set: mockSet,
    del: mockDel,
  },
}));

mock.module("@workspace/db", () => ({
  db: {
    person: {
      findMany: mockFindMany,
    },
  },
}));

const {
  cached,
  cacheKeys,
  invalidateGithubStats,
  invalidateMeetingTemplates,
  invalidateMgmtChain,
  invalidatePeopleCache,
  invalidatePersonMeByIds,
  invalidateProjectCache,
  invalidateReferenceData,
  ttl,
} = await import("../cache");

describe("cacheKeys", () => {
  test("generates correct static keys", () => {
    expect(cacheKeys.departments).toBe("enghub:departments:all");
    expect(cacheKeys.titles).toBe("enghub:titles:all");
    expect(cacheKeys.projectList).toBe("enghub:projects:list");
    expect(cacheKeys.people).toBe("enghub:people:all");
    expect(cacheKeys.meetingTemplates).toBe("enghub:meeting-templates:all");
  });

  test("generates correct dynamic keys", () => {
    expect(cacheKeys.project("proj-1")).toBe("enghub:project:proj-1");
    expect(cacheKeys.personMe("clerk-abc")).toBe("enghub:person-me:clerk-abc");
    expect(cacheKeys.clerkPerson("clerk-abc")).toBe(
      "enghub:clerk-person:clerk-abc",
    );
    expect(cacheKeys.mgmtChain("person-1")).toBe("enghub:mgmt-chain:person-1");
    expect(cacheKeys.githubStats("proj-1")).toBe("enghub:github-stats:proj-1");
  });
});

describe("ttl", () => {
  test("has expected TTL values", () => {
    expect(ttl.referenceData).toBe(86400);
    expect(ttl.project).toBe(3600);
    expect(ttl.projectList).toBe(3600);
    expect(ttl.people).toBe(1800);
    expect(ttl.personMe).toBe(3600);
    expect(ttl.clerkPerson).toBe(3600);
    expect(ttl.mgmtChain).toBe(1800);
    expect(ttl.githubStats).toBe(3600);
  });
});

describe("cached", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockDel.mockReset();
  });

  test("returns cached value on hit", async () => {
    mockGet.mockResolvedValue({ name: "cached-data" });
    const fetchFn = mock(() => Promise.resolve({ name: "fresh" }));

    const result = await cached("test-key", 60, fetchFn);

    expect(result).toEqual({ name: "cached-data" });
    expect(mockGet).toHaveBeenCalledWith("test-key");
    expect(fetchFn).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  test("calls fetch and caches on miss (null)", async () => {
    mockGet.mockResolvedValue(null);
    const fetchData = { name: "fresh-data" };
    const fetchFn = mock(() => Promise.resolve(fetchData));

    const result = await cached("test-key", 120, fetchFn);

    expect(result).toEqual(fetchData);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith("test-key", fetchData, { ex: 120 });
  });

  test("calls fetch and caches on miss (undefined)", async () => {
    mockGet.mockResolvedValue(undefined);
    const fetchData = [1, 2, 3];
    const fetchFn = mock(() => Promise.resolve(fetchData));

    const result = await cached("test-key", 300, fetchFn);

    expect(result).toEqual(fetchData);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("caches null results from fetch (nullable queries)", async () => {
    mockGet.mockResolvedValue(null);
    const fetchFn = mock(() => Promise.resolve(null));

    const result = await cached("test-key", 60, fetchFn);

    expect(result).toBeNull();
    expect(mockSet).toHaveBeenCalledWith("test-key", null, { ex: 60 });
  });
});

describe("invalidation helpers", () => {
  beforeEach(() => {
    mockDel.mockReset();
    mockFindMany.mockReset();
  });

  test("invalidateReferenceData deletes department and title keys", async () => {
    await invalidateReferenceData();
    expect(mockDel).toHaveBeenCalledWith(
      "enghub:departments:all",
      "enghub:titles:all",
    );
  });

  test("invalidateProjectCache deletes project and list keys", async () => {
    await invalidateProjectCache("proj-123");
    expect(mockDel).toHaveBeenCalledWith(
      "enghub:project:proj-123",
      "enghub:projects:list",
    );
  });

  test("invalidatePeopleCache deletes people key only when no userId", async () => {
    await invalidatePeopleCache();
    expect(mockDel).toHaveBeenCalledWith("enghub:people:all");
  });

  test("invalidatePeopleCache deletes people + personMe keys when userId provided", async () => {
    await invalidatePeopleCache("clerk-abc");
    expect(mockDel).toHaveBeenCalledWith(
      "enghub:people:all",
      "enghub:person-me:clerk-abc",
    );
  });

  test("invalidatePeopleCache skips personMe for null userId", async () => {
    await invalidatePeopleCache(null);
    expect(mockDel).toHaveBeenCalledWith("enghub:people:all");
  });

  test("invalidateMgmtChain deletes the chain key", async () => {
    await invalidateMgmtChain("person-1");
    expect(mockDel).toHaveBeenCalledWith("enghub:mgmt-chain:person-1");
  });

  test("invalidateGithubStats deletes the stats key", async () => {
    await invalidateGithubStats("proj-1");
    expect(mockDel).toHaveBeenCalledWith("enghub:github-stats:proj-1");
  });

  test("invalidateMeetingTemplates deletes the templates key", async () => {
    await invalidateMeetingTemplates();
    expect(mockDel).toHaveBeenCalledWith("enghub:meeting-templates:all");
  });

  test("invalidatePersonMeByIds looks up clerkUserIds and deletes personMe keys", async () => {
    mockFindMany.mockResolvedValueOnce([
      { clerkUserId: "clerk-1" },
      { clerkUserId: "clerk-2" },
    ]);
    await invalidatePersonMeByIds("person-a", "person-b");
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["person-a", "person-b"] },
        clerkUserId: { not: null },
      },
      select: { clerkUserId: true },
    });
    expect(mockDel).toHaveBeenCalledWith(
      "enghub:person-me:clerk-1",
      "enghub:person-me:clerk-2",
    );
  });

  test("invalidatePersonMeByIds skips null/empty personIds", async () => {
    await invalidatePersonMeByIds(null, null);
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockDel).not.toHaveBeenCalled();
  });

  test("invalidatePersonMeByIds skips redis.del when no clerkUserIds found", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await invalidatePersonMeByIds("person-x");
    expect(mockFindMany).toHaveBeenCalled();
    expect(mockDel).not.toHaveBeenCalled();
  });
});
