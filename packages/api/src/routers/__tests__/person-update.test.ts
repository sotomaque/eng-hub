import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

const mockInvalidatePeopleCache = mock(() => Promise.resolve());
const mockInvalidateMgmtChain = mock(() => Promise.resolve());
const mockInvalidatePersonMeByIds = mock(() => Promise.resolve());
const mockInvalidateReferenceData = mock(() => Promise.resolve());

mock.module("../../lib/cache", () => ({
  cached: mock((_key: string, _ttl: number, fn: () => unknown) => fn()),
  cacheKeys: { people: "p", personMe: () => "pm", clerkPerson: () => "cp" },
  ttl: { people: 1, personMe: 1, clerkPerson: 1 },
  invalidatePeopleCache: mockInvalidatePeopleCache,
  invalidateMgmtChain: mockInvalidateMgmtChain,
  invalidatePersonMeByIds: mockInvalidatePersonMeByIds,
  invalidateProjectCache: mock(() => Promise.resolve()),
  invalidateReferenceData: mockInvalidateReferenceData,
  invalidateGithubStats: mock(() => Promise.resolve()),
  invalidateMeetingTemplates: mock(() => Promise.resolve()),
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

mock.module("next/server", () => ({
  after: mock((fn: () => Promise<void>) => fn()),
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── DB mock ──────────────────────────────────────────────────

const mockFindUniqueOrThrow = mock(() =>
  Promise.resolve({
    managerId: null,
    clerkUserId: null,
    departmentId: null,
    titleId: null,
  }),
);
const mockPersonFindUnique = mock(() =>
  Promise.resolve(null as { managerId: string | null } | null),
);
const mockPersonUpdate = mock(() => Promise.resolve({ id: "person-1" }));
const mockManagerChangeCreate = mock(() => Promise.resolve({}));
const mockPersonFindMany = mock(() => Promise.resolve([]));

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
      clerkUserId: null,
      departmentId: null,
      titleId: null,
    });
    mockPersonFindUnique.mockReset();
    mockPersonUpdate.mockReset().mockResolvedValue({ id: "person-1" });
    mockManagerChangeCreate.mockReset();
    mockPersonFindMany.mockReset().mockResolvedValue([]);
    mockInvalidatePeopleCache.mockReset();
    mockInvalidateMgmtChain.mockReset();
    mockInvalidatePersonMeByIds.mockReset();
    mockInvalidateReferenceData.mockReset();
  });

  test("succeeds when no manager change", async () => {
    const result = await caller.update(validInput);
    expect(result).toEqual({ id: "person-1" });
    expect(mockManagerChangeCreate).not.toHaveBeenCalled();
  });

  test("logs manager change when manager changes", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      managerId: "old-mgr",
      clerkUserId: null,
      departmentId: null,
      titleId: null,
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
      clerkUserId: null,
      departmentId: null,
      titleId: null,
    });

    await caller.update({ ...validInput, managerId: "same-mgr" });

    expect(mockManagerChangeCreate).not.toHaveBeenCalled();
  });

  test("throws BAD_REQUEST on cycle detection", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      managerId: null,
      clerkUserId: null,
      departmentId: null,
      titleId: null,
    });
    // person-1 wants new-mgr, but new-mgr's manager is person-1 → cycle
    mockPersonFindUnique.mockResolvedValueOnce({ managerId: "person-1" });

    await expect(
      caller.update({ ...validInput, managerId: "new-mgr" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("circular"),
    });
  });

  test("allows setting manager when no cycle exists", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      managerId: null,
      clerkUserId: null,
      departmentId: null,
      titleId: null,
    });
    // new-mgr has no manager → chain ends, no cycle
    mockPersonFindUnique.mockResolvedValueOnce({ managerId: null });

    const result = await caller.update({
      ...validInput,
      managerId: "new-mgr",
    });
    expect(result).toEqual({ id: "person-1" });
  });

  test("invalidates management chains on manager change", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      managerId: "old-mgr",
      clerkUserId: null,
      departmentId: null,
      titleId: null,
    });
    // No cycle
    mockPersonFindUnique.mockResolvedValueOnce({ managerId: null });

    await caller.update({ ...validInput, managerId: "new-mgr" });

    expect(mockInvalidateMgmtChain).toHaveBeenCalledWith("person-1");
    expect(mockInvalidatePersonMeByIds).toHaveBeenCalledWith(
      "old-mgr",
      "new-mgr",
    );
  });

  test("invalidates reference data when department changes", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      managerId: null,
      clerkUserId: null,
      departmentId: "dept-old",
      titleId: null,
    });

    await caller.update({ ...validInput, departmentId: "dept-new" });

    expect(mockInvalidateReferenceData).toHaveBeenCalled();
  });

  test("does not invalidate reference data when department unchanged", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      managerId: null,
      clerkUserId: null,
      departmentId: "dept-1",
      titleId: null,
    });

    await caller.update({ ...validInput, departmentId: "dept-1" });

    expect(mockInvalidateReferenceData).not.toHaveBeenCalled();
  });
});
