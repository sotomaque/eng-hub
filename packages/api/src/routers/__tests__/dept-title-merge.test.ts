import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

const mockInvalidateReferenceData = mock(() => Promise.resolve());
const mockInvalidatePeopleCache = mock(() => Promise.resolve());

mock.module("../../lib/cache", () => ({
  cached: mock((_key: string, _ttl: number, fn: () => unknown) => fn()),
  cacheKeys: { departments: "d", titles: "t" },
  ttl: { referenceData: 1 },
  invalidateReferenceData: mockInvalidateReferenceData,
  invalidatePeopleCache: mockInvalidatePeopleCache,
  invalidateProjectCache: mock(() => Promise.resolve()),
  invalidateMgmtChain: mock(() => Promise.resolve()),
  invalidatePersonMeByIds: mock(() => Promise.resolve()),
  invalidateGithubStats: mock(() => Promise.resolve()),
  invalidateMeetingTemplates: mock(() => Promise.resolve()),
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

// ── TX mock ─────────────────────────────────────────────────

const mockTxPersonUpdateMany = mock(() => Promise.resolve({ count: 0 }));
const mockTxTitleUpdateMany = mock(() => Promise.resolve({ count: 0 }));
const mockTxDeptDeleteMany = mock(() => Promise.resolve({ count: 0 }));
const mockTxTitleDeleteMany = mock(() => Promise.resolve({ count: 0 }));

const tx = {
  person: { updateMany: mockTxPersonUpdateMany },
  title: {
    updateMany: mockTxTitleUpdateMany,
    deleteMany: mockTxTitleDeleteMany,
  },
  department: { deleteMany: mockTxDeptDeleteMany },
};

mock.module("@workspace/db", () => ({
  db: {
    department: {
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: "dept-1" })),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    title: {
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: "title-1" })),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
      aggregate: mock(() => Promise.resolve({ _max: { sortOrder: 0 } })),
    },
    $transaction: mock((fnOrArr: unknown) => {
      if (typeof fnOrArr === "function") return fnOrArr(tx);
      return Promise.resolve([]);
    }),
  },
}));

// ── Import routers after mocks ─────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { departmentRouter } = await import("../department");
const { titleRouter } = await import("../title");

const deptCaller = createCallerFactory(departmentRouter)({
  userId: "test-user-id",
});
const titleCaller = createCallerFactory(titleRouter)({
  userId: "test-user-id",
});

// ── Tests ──────────────────────────────────────────────────

describe("department.merge", () => {
  beforeEach(() => {
    mockTxPersonUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockTxTitleUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockTxDeptDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    mockInvalidateReferenceData.mockReset();
    mockInvalidatePeopleCache.mockReset();
  });

  test("re-parents people to keepId", async () => {
    await deptCaller.merge({
      keepId: "dept-keep",
      mergeIds: ["dept-a", "dept-b"],
    });

    expect(mockTxPersonUpdateMany).toHaveBeenCalledWith({
      where: { departmentId: { in: ["dept-a", "dept-b"] } },
      data: { departmentId: "dept-keep" },
    });
  });

  test("re-parents titles to keepId", async () => {
    await deptCaller.merge({
      keepId: "dept-keep",
      mergeIds: ["dept-a", "dept-b"],
    });

    expect(mockTxTitleUpdateMany).toHaveBeenCalledWith({
      where: { departmentId: { in: ["dept-a", "dept-b"] } },
      data: { departmentId: "dept-keep" },
    });
  });

  test("deletes merged departments", async () => {
    await deptCaller.merge({
      keepId: "dept-keep",
      mergeIds: ["dept-a", "dept-b"],
    });

    expect(mockTxDeptDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["dept-a", "dept-b"] } },
    });
  });

  test("invalidates reference data and people caches", async () => {
    await deptCaller.merge({
      keepId: "dept-keep",
      mergeIds: ["dept-a"],
    });

    expect(mockInvalidateReferenceData).toHaveBeenCalled();
    expect(mockInvalidatePeopleCache).toHaveBeenCalled();
  });
});

describe("title.merge", () => {
  beforeEach(() => {
    mockTxPersonUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockTxTitleDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    mockInvalidateReferenceData.mockReset();
    mockInvalidatePeopleCache.mockReset();
  });

  test("re-parents people to keepId", async () => {
    await titleCaller.merge({
      keepId: "title-keep",
      mergeIds: ["title-a", "title-b"],
    });

    expect(mockTxPersonUpdateMany).toHaveBeenCalledWith({
      where: { titleId: { in: ["title-a", "title-b"] } },
      data: { titleId: "title-keep" },
    });
  });

  test("deletes merged titles", async () => {
    await titleCaller.merge({
      keepId: "title-keep",
      mergeIds: ["title-a", "title-b"],
    });

    expect(mockTxTitleDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["title-a", "title-b"] } },
    });
  });

  test("invalidates reference data and people caches", async () => {
    await titleCaller.merge({
      keepId: "title-keep",
      mergeIds: ["title-a"],
    });

    expect(mockInvalidateReferenceData).toHaveBeenCalled();
    expect(mockInvalidatePeopleCache).toHaveBeenCalled();
  });
});
