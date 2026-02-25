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
