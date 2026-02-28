import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

mock.module("../../lib/sync-arrangement", () => ({
  syncLiveToActiveArrangement: mock(() => Promise.resolve()),
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── DB mock ──────────────────────────────────────────────────

const mockPersonFindUnique = mock(() => Promise.resolve(null));
const mockPersonCreate = mock(() => Promise.resolve({ id: "person-1", managerId: null }));
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
const mockTeamMemberFindFirst = mock(() => Promise.resolve(null));
const mockTeamMemberUpdate = mock(() =>
  Promise.resolve({ id: "tm-1", personId: "person-1", projectId: "proj-1" }),
);
const mockTeamMemberFindMany = mock(() => Promise.resolve([]));
const mockTeamMemberFindUnique = mock(() => Promise.resolve(null));
const mockTeamMembershipCreateMany = mock(() => Promise.resolve({ count: 0 }));
const mockTeamMembershipDeleteMany = mock(() => Promise.resolve({ count: 0 }));
const mockArrangementAssignmentDeleteMany = mock(() => Promise.resolve({ count: 0 }));
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
    update: mockTeamMemberUpdate,
    findFirst: mockTeamMemberFindFirst,
    findUniqueOrThrow: mockTeamMemberFindUniqueOrThrow,
  },
  teamMembership: {
    createMany: mockTeamMembershipCreateMany,
    deleteMany: mockTeamMembershipDeleteMany,
  },
  arrangementAssignment: { deleteMany: mockArrangementAssignmentDeleteMany },
  managerChange: { create: mockManagerChangeCreate },
};

const mockTransaction = mock(async (fn: (arg: unknown) => Promise<unknown>) => fn(tx));

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
    mockPersonFindUnique.mockReset().mockResolvedValue(null);
    mockPersonCreate.mockReset().mockResolvedValue({ id: "person-1", managerId: null });
    mockTeamMemberCreate.mockReset().mockResolvedValue({
      id: "tm-1",
      personId: "person-1",
      projectId: "proj-1",
    });
    mockTeamMemberFindFirst.mockReset().mockResolvedValue(null);
    mockTeamMemberUpdate.mockReset().mockResolvedValue({
      id: "tm-reactivated",
      personId: "person-1",
      projectId: "proj-1",
    });
    mockTeamMembershipCreateMany.mockReset();
    mockManagerChangeCreate.mockReset();
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

  test("reactivates rolled-off member instead of creating new", async () => {
    mockPersonFindUnique.mockResolvedValue({ id: "person-1", managerId: null });
    mockTeamMemberFindFirst.mockResolvedValue({
      id: "tm-old",
      personId: "person-1",
      projectId: "proj-1",
      leftAt: new Date("2025-01-01"),
    });

    await caller.create({
      projectId: "proj-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      departmentId: "dept-1",
    });

    // Should clear leftAt on the rolled-off record
    expect(mockTeamMemberUpdate).toHaveBeenCalledWith({
      where: { id: "tm-old" },
      data: { leftAt: null },
    });
    // Should NOT create a new team member
    expect(mockTeamMemberCreate).not.toHaveBeenCalled();
  });

  test("creates new member when no rolled-off record exists", async () => {
    mockTeamMemberFindFirst.mockResolvedValue(null);

    await caller.create({
      projectId: "proj-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      departmentId: "dept-1",
    });

    expect(mockTeamMemberCreate).toHaveBeenCalled();
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

describe("teamMember.delete (soft-delete)", () => {
  beforeEach(() => {
    mockTeamMemberUpdate.mockReset().mockResolvedValue({
      id: "tm-1",
      personId: "person-1",
      projectId: "proj-1",
      leftAt: new Date(),
    });
    mockTeamMembershipDeleteMany.mockReset();
    mockArrangementAssignmentDeleteMany.mockReset();
  });

  test("sets leftAt instead of hard-deleting", async () => {
    await caller.delete({ id: "tm-1" });

    const call = mockTeamMemberUpdate.mock.calls[0] as [
      { where: { id: string }; data: { leftAt: unknown } },
    ];
    expect(call[0].where).toEqual({ id: "tm-1" });
    expect(call[0].data.leftAt).toBeInstanceOf(Date);
  });

  test("removes team memberships on soft-delete", async () => {
    await caller.delete({ id: "tm-1" });

    expect(mockTeamMembershipDeleteMany).toHaveBeenCalledWith({
      where: { teamMemberId: "tm-1" },
    });
  });

  test("removes arrangement assignments on soft-delete", async () => {
    await caller.delete({ id: "tm-1" });

    expect(mockArrangementAssignmentDeleteMany).toHaveBeenCalledWith({
      where: { teamMemberId: "tm-1" },
    });
  });
});
