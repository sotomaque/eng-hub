import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

mock.module("../../lib/sync-arrangement", () => ({
  syncLiveToActiveArrangement: mock(() => Promise.resolve()),
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── DB mock ──────────────────────────────────────────────────

const mockPersonFindUnique = mock(() =>
  Promise.resolve(null as { id?: string; managerId: string | null } | null),
);
const mockPersonUpdate = mock(() => Promise.resolve({}));
const mockPersonUpdateMany = mock(() => Promise.resolve({ count: 0 }));
const mockManagerChangeCreateMany = mock(() => Promise.resolve({ count: 0 }));
const mockQueryRaw = mock(() => Promise.resolve([{ found: false }]));

const mockTxPersonFindMany = mock(() =>
  Promise.resolve([] as { id: string; managerId: string | null }[]),
);

const tx = {
  person: {
    findMany: mockTxPersonFindMany,
    findUniqueOrThrow: mock(() => Promise.resolve({ managerId: "old-mgr" })),
    update: mockPersonUpdate,
    updateMany: mockPersonUpdateMany,
  },
  managerChange: {
    create: mock(() => Promise.resolve({})),
    createMany: mockManagerChangeCreateMany,
  },
};

const mockTransaction = mock(async (fn: (arg: unknown) => Promise<unknown>) => fn(tx));

mock.module("@workspace/db", () => ({
  db: {
    person: {
      findUnique: mockPersonFindUnique,
      findUniqueOrThrow: mock(() => Promise.resolve({ managerId: null })),
      findMany: mock(() => Promise.resolve([])),
      update: mockPersonUpdate,
      create: mock(() => Promise.resolve({ id: "new-person" })),
      delete: mock(() => Promise.resolve({})),
      count: mock(() => Promise.resolve(0)),
      updateMany: mockPersonUpdateMany,
      groupBy: mock(() => Promise.resolve([])),
    },
    managerChange: {
      create: mock(() => Promise.resolve({})),
      createMany: mockManagerChangeCreateMany,
    },
    teamMember: {
      create: mock(() => Promise.resolve({ id: "tm-1" })),
      delete: mock(() => Promise.resolve({})),
      groupBy: mock(() => Promise.resolve([])),
    },
    teamMembership: {
      createMany: mock(() => Promise.resolve({ count: 0 })),
    },
    $transaction: mockTransaction,
    $queryRaw: mockQueryRaw,
  },
}));

// ── Import router after mocks ──────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { personRouter } = await import("../person");

const createCaller = createCallerFactory(personRouter);
const caller = createCaller({
  userId: "test-user-id",
  personId: "person-1",
  access: {
    personId: "person-1",
    capabilities: new Set(["admin:access"]),
    projectCapabilities: new Map(),
    isAdmin: true,
  },
});

// ── Tests ──────────────────────────────────────────────────

describe("person.reassignReports", () => {
  beforeEach(() => {
    mockPersonFindUnique.mockReset();
    mockPersonUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockManagerChangeCreateMany.mockReset().mockResolvedValue({ count: 0 });
    mockTxPersonFindMany.mockReset().mockResolvedValue([]);
    mockQueryRaw.mockReset().mockResolvedValue([{ found: false }]);
    mockTransaction
      .mockReset()
      .mockImplementation(async (fn: (arg: unknown) => Promise<unknown>) => fn(tx));
  });

  test("reassigns multiple reports and logs manager changes", async () => {
    // Existence check for newManagerId
    mockPersonFindUnique.mockResolvedValueOnce({ managerId: null, id: "new-mgr" });
    mockTxPersonFindMany.mockResolvedValueOnce([
      { id: "person-a", managerId: "old-mgr" },
      { id: "person-b", managerId: "old-mgr" },
    ]);

    const result = await caller.reassignReports({
      personIds: ["person-a", "person-b"],
      newManagerId: "new-mgr",
    });

    expect(result.count).toBe(2);
    expect(mockPersonUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["person-a", "person-b"] } },
      data: { managerId: "new-mgr" },
    });
    expect(mockManagerChangeCreateMany).toHaveBeenCalledWith({
      data: [
        {
          personId: "person-a",
          oldManagerId: "old-mgr",
          newManagerId: "new-mgr",
          changedBy: "test-user-id",
        },
        {
          personId: "person-b",
          oldManagerId: "old-mgr",
          newManagerId: "new-mgr",
          changedBy: "test-user-id",
        },
      ],
    });
  });

  test("throws NOT_FOUND when new manager does not exist", async () => {
    mockPersonFindUnique.mockResolvedValueOnce(null);

    await expect(
      caller.reassignReports({
        personIds: ["person-a"],
        newManagerId: "nonexistent",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(mockPersonUpdateMany).not.toHaveBeenCalled();
  });

  test("throws BAD_REQUEST on cycle detection", async () => {
    // newManagerId exists
    mockPersonFindUnique.mockResolvedValueOnce({ managerId: null, id: "new-mgr" });
    // cycle detected by recursive CTE
    mockQueryRaw.mockResolvedValueOnce([{ found: true }]);

    await expect(
      caller.reassignReports({
        personIds: ["person-a"],
        newManagerId: "new-mgr",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("circular"),
    });

    expect(mockPersonUpdateMany).not.toHaveBeenCalled();
  });

  test("logs correct old and new manager IDs in audit trail", async () => {
    mockPersonFindUnique.mockResolvedValueOnce({ managerId: null, id: "new-mgr" });
    mockTxPersonFindMany.mockResolvedValueOnce([{ id: "person-a", managerId: "old-mgr-id" }]);

    await caller.reassignReports({
      personIds: ["person-a"],
      newManagerId: "new-mgr",
    });

    expect(mockManagerChangeCreateMany).toHaveBeenCalledWith({
      data: [
        {
          personId: "person-a",
          oldManagerId: "old-mgr-id",
          newManagerId: "new-mgr",
          changedBy: "test-user-id",
        },
      ],
    });
  });
});
