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
  Promise.resolve(null as { managerId: string | null } | null),
);
const mockPersonFindUniqueOrThrow = mock(() => Promise.resolve({ managerId: "old-mgr" }));
const mockPersonUpdate = mock(() => Promise.resolve({}));
const mockManagerChangeCreate = mock(() => Promise.resolve({}));

const tx = {
  person: {
    findUniqueOrThrow: mockPersonFindUniqueOrThrow,
    update: mockPersonUpdate,
  },
  managerChange: { create: mockManagerChangeCreate },
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
      updateMany: mock(() => Promise.resolve({ count: 0 })),
      groupBy: mock(() => Promise.resolve([])),
    },
    managerChange: { create: mockManagerChangeCreate },
    teamMember: {
      create: mock(() => Promise.resolve({ id: "tm-1" })),
      delete: mock(() => Promise.resolve({})),
      groupBy: mock(() => Promise.resolve([])),
    },
    teamMembership: {
      createMany: mock(() => Promise.resolve({ count: 0 })),
    },
    $transaction: mockTransaction,
  },
}));

// ── Import router after mocks ──────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { personRouter } = await import("../person");

const createCaller = createCallerFactory(personRouter);
const caller = createCaller({ userId: "test-user-id" });

// ── Tests ──────────────────────────────────────────────────

describe("person.reassignReports", () => {
  beforeEach(() => {
    mockPersonFindUnique.mockReset();
    mockPersonFindUniqueOrThrow.mockReset().mockResolvedValue({ managerId: "old-mgr" });
    mockPersonUpdate.mockReset().mockResolvedValue({});
    mockManagerChangeCreate.mockReset().mockResolvedValue({});
    mockTransaction
      .mockReset()
      .mockImplementation(async (fn: (arg: unknown) => Promise<unknown>) => fn(tx));
  });

  test("reassigns multiple reports and logs manager changes", async () => {
    // Existence check for newManagerId
    mockPersonFindUnique
      .mockResolvedValueOnce({ managerId: null }) // newManagerId exists
      .mockResolvedValueOnce({ managerId: null }) // cycle check for person-a ends
      .mockResolvedValueOnce({ managerId: null }); // cycle check for person-b ends

    const result = await caller.reassignReports({
      personIds: ["person-a", "person-b"],
      newManagerId: "new-mgr",
    });

    expect(result.count).toBe(2);
    expect(mockPersonUpdate).toHaveBeenCalledTimes(2);
    expect(mockManagerChangeCreate).toHaveBeenCalledTimes(2);
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

    expect(mockPersonUpdate).not.toHaveBeenCalled();
  });

  test("throws BAD_REQUEST on cycle detection", async () => {
    // newManagerId exists
    mockPersonFindUnique
      .mockResolvedValueOnce({ managerId: null })
      // cycle: new-mgr's manager is person-a
      .mockResolvedValueOnce({ managerId: "person-a" });

    await expect(
      caller.reassignReports({
        personIds: ["person-a"],
        newManagerId: "new-mgr",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("circular"),
    });

    expect(mockPersonUpdate).not.toHaveBeenCalled();
  });

  test("logs correct old and new manager IDs in audit trail", async () => {
    mockPersonFindUnique
      .mockResolvedValueOnce({ managerId: null }) // existence
      .mockResolvedValueOnce({ managerId: null }); // cycle check ends
    mockPersonFindUniqueOrThrow.mockResolvedValue({ managerId: "old-mgr-id" });

    await caller.reassignReports({
      personIds: ["person-a"],
      newManagerId: "new-mgr",
    });

    expect(mockManagerChangeCreate).toHaveBeenCalledWith({
      data: {
        personId: "person-a",
        oldManagerId: "old-mgr-id",
        newManagerId: "new-mgr",
        changedBy: "test-user-id",
      },
    });
  });
});
