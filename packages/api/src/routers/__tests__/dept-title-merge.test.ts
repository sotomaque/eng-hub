import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

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
});

describe("title.merge", () => {
  beforeEach(() => {
    mockTxPersonUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockTxTitleDeleteMany.mockReset().mockResolvedValue({ count: 0 });
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
});
