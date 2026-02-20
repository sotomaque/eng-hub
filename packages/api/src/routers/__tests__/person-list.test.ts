import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

mock.module("../../lib/cache", () => ({
  cached: mock(
    (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
  ),
  cacheKeys: { people: "enghub:people:all" },
  ttl: { people: 1800 },
  invalidatePeopleCache: mock(() => Promise.resolve()),
  invalidateProjectCache: mock(() => Promise.resolve()),
  invalidateMgmtChain: mock(() => Promise.resolve()),
}));

mock.module("../../lib/sync-arrangement", () => ({
  syncLiveToActiveArrangement: mock(() => Promise.resolve()),
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

// ── DB mock ──────────────────────────────────────────────────

const mockPersonFindMany = mock(() => Promise.resolve([]));
const mockPersonCount = mock(() => Promise.resolve(0));
const mockTeamMemberGroupBy = mock(() => Promise.resolve([]));

mock.module("@workspace/db", () => ({
  db: {
    person: {
      findMany: mockPersonFindMany,
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({ id: "p-1" })),
      update: mock(() => Promise.resolve({})),
      updateMany: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
      count: mockPersonCount,
    },
    teamMember: {
      groupBy: mockTeamMemberGroupBy,
    },
    managerChange: {
      create: mock(() => Promise.resolve({})),
    },
  },
}));

// ── Import router + create caller ────────────────────────────

const { personRouter } = await import("../person");
const { createCallerFactory } = await import("../../trpc");

const createCaller = createCallerFactory(personRouter);
const caller = createCaller({ userId: "test-user-id" });

// ── Tests ────────────────────────────────────────────────────

describe("person.list", () => {
  beforeEach(() => {
    mockPersonFindMany.mockReset().mockResolvedValue([]);
    mockPersonCount.mockReset().mockResolvedValue(0);
    mockTeamMemberGroupBy.mockReset().mockResolvedValue([]);
  });

  test("returns paginated results with totalCount", async () => {
    const items = [
      { id: "p-1", firstName: "Alice", lastName: "Smith" },
      { id: "p-2", firstName: "Bob", lastName: "Jones" },
    ];
    mockPersonFindMany.mockResolvedValue(items);
    mockPersonCount.mockResolvedValue(25);

    const result = await caller.list({ page: 1, pageSize: 10 });

    expect(result.items).toEqual(items);
    expect(result.totalCount).toBe(25);
  });

  test("applies skip/take for pagination", async () => {
    await caller.list({ page: 3, pageSize: 10 });

    const callArgs = mockPersonFindMany.mock.calls[0]?.[0] as {
      skip?: number;
      take?: number;
    };
    expect(callArgs.skip).toBe(20); // (3-1) * 10
    expect(callArgs.take).toBe(10);
  });

  test("applies search filter across multiple fields", async () => {
    await caller.list({ page: 1, pageSize: 10, search: "alice" });

    const callArgs = mockPersonFindMany.mock.calls[0]?.[0] as {
      where?: { OR?: unknown[] };
    };
    expect(callArgs.where?.OR).toHaveLength(4);
  });

  test("does NOT call groupBy when multiProject is false/undefined", async () => {
    await caller.list({ page: 1, pageSize: 10 });

    expect(mockTeamMemberGroupBy).not.toHaveBeenCalled();
  });

  test("calls groupBy and filters by person IDs when multiProject is true", async () => {
    mockTeamMemberGroupBy.mockResolvedValue([
      { personId: "p-1", _count: { personId: 2 } },
      { personId: "p-3", _count: { personId: 3 } },
    ]);

    await caller.list({ page: 1, pageSize: 10, multiProject: true });

    expect(mockTeamMemberGroupBy).toHaveBeenCalledWith({
      by: ["personId"],
      _count: { personId: true },
      having: { personId: { _count: { gt: 1 } } },
    });

    const callArgs = mockPersonFindMany.mock.calls[0]?.[0] as {
      where?: { id?: { in: string[] } };
    };
    expect(callArgs.where?.id).toEqual({ in: ["p-1", "p-3"] });
  });

  test("multiProject filter combines with search filter", async () => {
    mockTeamMemberGroupBy.mockResolvedValue([
      { personId: "p-1", _count: { personId: 2 } },
    ]);

    await caller.list({
      page: 1,
      pageSize: 10,
      search: "alice",
      multiProject: true,
    });

    const callArgs = mockPersonFindMany.mock.calls[0]?.[0] as {
      where?: { OR?: unknown[]; id?: { in: string[] } };
    };
    // Both search (OR) and multiProject (id.in) should be present
    expect(callArgs.where?.OR).toHaveLength(4);
    expect(callArgs.where?.id).toEqual({ in: ["p-1"] });
  });

  test("returns empty items when multiProject yields no person IDs", async () => {
    mockTeamMemberGroupBy.mockResolvedValue([]);
    mockPersonFindMany.mockResolvedValue([]);
    mockPersonCount.mockResolvedValue(0);

    const result = await caller.list({
      page: 1,
      pageSize: 10,
      multiProject: true,
    });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    // where should have id: { in: [] }
    const callArgs = mockPersonFindMany.mock.calls[0]?.[0] as {
      where?: { id?: { in: string[] } };
    };
    expect(callArgs.where?.id).toEqual({ in: [] });
  });

  test("sorts by name ascending by default", async () => {
    await caller.list({ page: 1, pageSize: 10 });

    const callArgs = mockPersonFindMany.mock.calls[0]?.[0] as {
      orderBy?: object[];
    };
    expect(callArgs.orderBy).toEqual([
      { lastName: "asc" },
      { firstName: "asc" },
    ]);
  });

  test("sorts by department descending", async () => {
    await caller.list({
      page: 1,
      pageSize: 10,
      sortBy: "department",
      sortOrder: "desc",
    });

    const callArgs = mockPersonFindMany.mock.calls[0]?.[0] as {
      orderBy?: object[];
    };
    expect(callArgs.orderBy).toEqual([
      { department: { name: "desc" } },
      { lastName: "asc" },
    ]);
  });
});
