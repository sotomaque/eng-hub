import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

mock.module("../../lib/sync-arrangement", () => ({
  syncLiveToActiveArrangement: mock(() => Promise.resolve()),
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── DB mock ──────────────────────────────────────────────────

const mockFindUniqueOrThrow = mock(() =>
  Promise.resolve({
    managerId: null,
  }),
);
const mockPersonFindUnique = mock(() =>
  Promise.resolve(null as { managerId: string | null } | null),
);
const mockPersonUpdate = mock(() => Promise.resolve({ id: "person-1" }));
const mockManagerChangeCreate = mock(() => Promise.resolve({}));
const mockPersonFindMany = mock(() => Promise.resolve([]));
const mockQueryRaw = mock(() => Promise.resolve([{ found: false }]));

mock.module("@workspace/db", () => ({
  db: {
    person: {
      findUniqueOrThrow: mockFindUniqueOrThrow,
      findUnique: mockPersonFindUnique,
      findMany: mockPersonFindMany,
      update: mockPersonUpdate,
      create: mock(() => Promise.resolve({ id: "new-person" })),
      delete: mock(() => Promise.resolve({})),
      count: mock(() => Promise.resolve(0)),
      updateMany: mock(() => Promise.resolve({ count: 0 })),
      groupBy: mock(() => Promise.resolve([])),
    },
    managerChange: {
      create: mockManagerChangeCreate,
    },
    teamMember: {
      create: mock(() => Promise.resolve({ id: "tm-1" })),
      delete: mock(() => Promise.resolve({})),
      groupBy: mock(() => Promise.resolve([])),
    },
    teamMembership: {
      createMany: mock(() => Promise.resolve({ count: 0 })),
    },
    $transaction: mock((fn: (tx: unknown) => unknown) => fn({})),
    $queryRaw: mockQueryRaw,
  },
}));

// ── Import router after mocks ──────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { personRouter } = await import("../person");

const createCaller = createCallerFactory(personRouter);
const caller = createCaller({ userId: "test-user-id" });

const validInput = {
  id: "person-1",
  firstName: "Alice",
  lastName: "Smith",
  email: "alice@test.com",
};

// ── Tests ──────────────────────────────────────────────────

describe("person.update", () => {
  beforeEach(() => {
    mockFindUniqueOrThrow.mockReset().mockResolvedValue({
      managerId: null,
    });
    mockPersonFindUnique.mockReset();
    mockPersonUpdate.mockReset().mockResolvedValue({ id: "person-1" });
    mockManagerChangeCreate.mockReset();
    mockPersonFindMany.mockReset().mockResolvedValue([]);
    mockQueryRaw.mockReset().mockResolvedValue([{ found: false }]);
  });

  test("succeeds when no manager change", async () => {
    const result = await caller.update(validInput);
    expect(result).toEqual({ id: "person-1" });
    expect(mockManagerChangeCreate).not.toHaveBeenCalled();
  });

  test("logs manager change when manager changes", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      managerId: "old-mgr",
    });

    await caller.update({ ...validInput, managerId: "new-mgr" });

    expect(mockManagerChangeCreate).toHaveBeenCalledWith({
      data: {
        personId: "person-1",
        oldManagerId: "old-mgr",
        newManagerId: "new-mgr",
        changedBy: "test-user-id",
      },
    });
  });

  test("does not log when manager stays the same", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      managerId: "same-mgr",
    });

    await caller.update({ ...validInput, managerId: "same-mgr" });

    expect(mockManagerChangeCreate).not.toHaveBeenCalled();
  });

  test("throws BAD_REQUEST on cycle detection", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      managerId: null,
    });
    // cycle detected by recursive CTE
    mockQueryRaw.mockResolvedValueOnce([{ found: true }]);

    await expect(caller.update({ ...validInput, managerId: "new-mgr" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("circular"),
    });
  });

  test("allows setting manager when no cycle exists", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      managerId: null,
    });

    const result = await caller.update({
      ...validInput,
      managerId: "new-mgr",
    });
    expect(result).toEqual({ id: "person-1" });
  });
});
