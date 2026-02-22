import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

const mockInvalidateProjectCache = mock(() => Promise.resolve());
const mockInvalidatePeopleCache = mock(() => Promise.resolve());
const mockInvalidateMgmtChain = mock(() => Promise.resolve());

mock.module("../../lib/cache", () => ({
  cached: mock((_key: string, _ttl: number, fn: () => unknown) => fn()),
  cacheKeys: {},
  ttl: {},
  invalidateProjectCache: mockInvalidateProjectCache,
  invalidatePeopleCache: mockInvalidatePeopleCache,
  invalidateMgmtChain: mockInvalidateMgmtChain,
  invalidatePersonMeByIds: mock(() => Promise.resolve()),
  invalidateReferenceData: mock(() => Promise.resolve()),
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

// Mock rate limiter to always allow
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

// Mock next/server – after() just runs the callback immediately in tests
mock.module("next/server", () => ({
  after: mock((fn: () => Promise<void>) => fn()),
}));

// Mock Clerk auth to return a userId
mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── DB mock ──────────────────────────────────────────────────

const mockPersonFindUnique = mock(() => Promise.resolve(null));
const mockPersonCreate = mock(() =>
  Promise.resolve({ id: "person-1", managerId: null }),
);
const mockPersonUpdate = mock(() => Promise.resolve({}));
const mockTeamMemberCreate = mock(() =>
  Promise.resolve({ id: "tm-1", personId: "person-1", projectId: "proj-1" }),
);
const mockTeamMemberDelete = mock(() =>
  Promise.resolve({ id: "tm-1", personId: "person-1", projectId: "proj-1" }),
);
const mockTeamMemberFindUniqueOrThrow = mock(() =>
  Promise.resolve({
    id: "tm-1",
    personId: "person-1",
    projectId: "proj-1",
    person: { managerId: null },
  }),
);
const mockTeamMemberFindMany = mock(() => Promise.resolve([]));
const mockTeamMemberFindUnique = mock(() => Promise.resolve(null));
const mockTeamMembershipCreateMany = mock(() => Promise.resolve({ count: 0 }));
const mockTeamMembershipDeleteMany = mock(() => Promise.resolve({ count: 0 }));
const mockManagerChangeCreate = mock(() => Promise.resolve({}));

const tx = {
  person: {
    findUnique: mockPersonFindUnique,
    create: mockPersonCreate,
    update: mockPersonUpdate,
  },
  teamMember: {
    create: mockTeamMemberCreate,
    delete: mockTeamMemberDelete,
    findUniqueOrThrow: mockTeamMemberFindUniqueOrThrow,
  },
  teamMembership: {
    createMany: mockTeamMembershipCreateMany,
    deleteMany: mockTeamMembershipDeleteMany,
  },
  managerChange: { create: mockManagerChangeCreate },
};

const mockTransaction = mock(async (fn: (arg: unknown) => Promise<unknown>) =>
  fn(tx),
);

mock.module("@workspace/db", () => ({
  db: {
    $transaction: mockTransaction,
    teamMember: {
      findMany: mockTeamMemberFindMany,
      findUnique: mockTeamMemberFindUnique,
    },
  },
}));

// ── Import router + create caller ────────────────────────────

const { teamMemberRouter } = await import("../team-member");
const { createCallerFactory } = await import("../../trpc");

const createCaller = createCallerFactory(teamMemberRouter);
const caller = createCaller({ userId: "test-user-id" });

// ── Tests ────────────────────────────────────────────────────

describe("teamMember.create", () => {
  beforeEach(() => {
    mockInvalidateProjectCache.mockReset();
    mockInvalidatePeopleCache.mockReset();
    mockInvalidateMgmtChain.mockReset();
    mockPersonFindUnique.mockReset().mockResolvedValue(null);
    mockPersonCreate
      .mockReset()
      .mockResolvedValue({ id: "person-1", managerId: null });
    mockTeamMemberCreate.mockReset().mockResolvedValue({
      id: "tm-1",
      personId: "person-1",
      projectId: "proj-1",
    });
    mockTeamMembershipCreateMany.mockReset();
    mockManagerChangeCreate.mockReset();
  });

  test("invalidates both project cache and people cache", async () => {
    await caller.create({
      projectId: "proj-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      departmentId: "dept-1",
    });

    expect(mockInvalidateProjectCache).toHaveBeenCalledWith("proj-1");
    expect(mockInvalidatePeopleCache).toHaveBeenCalledTimes(1);
  });

  test("creates team memberships when teamIds provided", async () => {
    await caller.create({
      projectId: "proj-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      departmentId: "dept-1",
      teamIds: ["team-a", "team-b"],
    });

    expect(mockTeamMembershipCreateMany).toHaveBeenCalledWith({
      data: [
        { teamId: "team-a", teamMemberId: "tm-1" },
        { teamId: "team-b", teamMemberId: "tm-1" },
      ],
    });
  });

  test("logs manager change when creating new person with manager", async () => {
    mockPersonCreate.mockResolvedValue({ id: "person-2", managerId: "mgr-1" });

    await caller.create({
      projectId: "proj-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      departmentId: "dept-1",
      managerId: "mgr-1",
    });

    expect(mockManagerChangeCreate).toHaveBeenCalledWith({
      data: {
        personId: "person-2",
        oldManagerId: null,
        newManagerId: "mgr-1",
        changedBy: "test-user-id",
      },
    });
  });
});

describe("teamMember.update", () => {
  beforeEach(() => {
    mockInvalidateProjectCache.mockReset();
    mockInvalidatePeopleCache.mockReset();
    mockInvalidateMgmtChain.mockReset();
    mockTeamMemberFindUniqueOrThrow.mockReset().mockResolvedValue({
      id: "tm-1",
      personId: "person-1",
      projectId: "proj-1",
      person: { managerId: null },
    });
    mockPersonUpdate.mockReset();
    mockTeamMembershipDeleteMany.mockReset();
    mockTeamMembershipCreateMany.mockReset();
    mockManagerChangeCreate.mockReset();
  });

  test("invalidates both project cache and people cache", async () => {
    await caller.update({
      id: "tm-1",
      firstName: "Jane",
      lastName: "Updated",
      email: "jane@example.com",
      departmentId: "dept-1",
    });

    expect(mockInvalidateProjectCache).toHaveBeenCalledWith("proj-1");
    expect(mockInvalidatePeopleCache).toHaveBeenCalledTimes(1);
  });

  test("invalidates mgmt chain when manager changes", async () => {
    mockTeamMemberFindUniqueOrThrow.mockResolvedValue({
      id: "tm-1",
      personId: "person-1",
      projectId: "proj-1",
      person: { managerId: "old-mgr" },
    });

    await caller.update({
      id: "tm-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      departmentId: "dept-1",
      managerId: "new-mgr",
    });

    expect(mockInvalidateMgmtChain).toHaveBeenCalledWith("person-1");
  });

  test("does NOT invalidate mgmt chain when manager unchanged", async () => {
    mockTeamMemberFindUniqueOrThrow.mockResolvedValue({
      id: "tm-1",
      personId: "person-1",
      projectId: "proj-1",
      person: { managerId: "same-mgr" },
    });

    await caller.update({
      id: "tm-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      departmentId: "dept-1",
      managerId: "same-mgr",
    });

    expect(mockInvalidateMgmtChain).not.toHaveBeenCalled();
  });

  test("logs manager change record", async () => {
    mockTeamMemberFindUniqueOrThrow.mockResolvedValue({
      id: "tm-1",
      personId: "person-1",
      projectId: "proj-1",
      person: { managerId: "old-mgr" },
    });

    await caller.update({
      id: "tm-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      departmentId: "dept-1",
      managerId: "new-mgr",
    });

    expect(mockManagerChangeCreate).toHaveBeenCalledWith({
      data: {
        personId: "person-1",
        oldManagerId: "old-mgr",
        newManagerId: "new-mgr",
        changedBy: "test-user-id",
      },
    });
  });
});

describe("teamMember.delete", () => {
  beforeEach(() => {
    mockInvalidateProjectCache.mockReset();
    mockInvalidatePeopleCache.mockReset();
    mockTeamMemberDelete.mockReset().mockResolvedValue({
      id: "tm-1",
      personId: "person-1",
      projectId: "proj-1",
    });
  });

  test("invalidates both project cache and people cache", async () => {
    await caller.delete({ id: "tm-1" });

    expect(mockInvalidateProjectCache).toHaveBeenCalledWith("proj-1");
    expect(mockInvalidatePeopleCache).toHaveBeenCalledTimes(1);
  });
});
