import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── TX mock ─────────────────────────────────────────────────

const mockTxFindUniqueOrThrow = mock(() =>
  Promise.resolve({
    projectId: "proj-1",
    teams: [] as {
      id: string;
      name: string;
      sortOrder: number;
      assignments: { teamMemberId: string }[];
    }[],
  }),
);
const mockTxArrangementUpdateMany = mock(() => Promise.resolve({ count: 0 }));
const mockTxArrTeamFindMany = mock(() =>
  Promise.resolve([] as { id: string }[]),
);
const mockTxArrTeamUpdateMany = mock(() => Promise.resolve({ count: 0 }));
const mockTxArrangementUpdate = mock(() => Promise.resolve({}));
const mockTxTeamDeleteMany = mock(() => Promise.resolve({ count: 0 }));
const mockTxTeamCreate = mock(() => Promise.resolve({ id: "live-t1" }));
const mockTxArrTeamUpdate = mock(() => Promise.resolve({}));
const mockTxMembershipCreateMany = mock(() => Promise.resolve({ count: 0 }));

const tx = {
  teamArrangement: {
    findUniqueOrThrow: mockTxFindUniqueOrThrow,
    updateMany: mockTxArrangementUpdateMany,
    update: mockTxArrangementUpdate,
    findFirst: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve({ id: "arr-1" })),
  },
  arrangementTeam: {
    findMany: mockTxArrTeamFindMany,
    updateMany: mockTxArrTeamUpdateMany,
    update: mockTxArrTeamUpdate,
    create: mock(() => Promise.resolve({ id: "at-1" })),
    aggregate: mock(() => Promise.resolve({ _max: { sortOrder: 0 } })),
    findUniqueOrThrow: mock(() => Promise.resolve({})),
    delete: mock(() => Promise.resolve({})),
  },
  arrangementAssignment: {
    createMany: mock(() => Promise.resolve({ count: 0 })),
    create: mock(() => Promise.resolve({})),
    deleteMany: mock(() => Promise.resolve({ count: 0 })),
  },
  team: {
    findMany: mock(() => Promise.resolve([])),
    deleteMany: mockTxTeamDeleteMany,
    create: mockTxTeamCreate,
    delete: mock(() => Promise.resolve({})),
  },
  teamMembership: {
    findMany: mock(() => Promise.resolve([])),
    createMany: mockTxMembershipCreateMany,
    create: mock(() => Promise.resolve({})),
    deleteMany: mock(() => Promise.resolve({ count: 0 })),
  },
  teamMember: {
    findMany: mock(() => Promise.resolve([])),
  },
};

mock.module("@workspace/db", () => ({
  db: {
    ...tx,
    $transaction: mock((fn: (t: unknown) => unknown) => fn(tx)),
  },
}));

// ── Import router after mocks ──────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { arrangementRouter } = await import("../arrangement");

const createCaller = createCallerFactory(arrangementRouter);
const caller = createCaller({ userId: "test-user-id" });

// ── Tests ──────────────────────────────────────────────────

describe("arrangement.activate", () => {
  beforeEach(() => {
    mockTxFindUniqueOrThrow.mockReset().mockResolvedValue({
      projectId: "proj-1",
      teams: [],
    });
    mockTxArrangementUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockTxArrTeamFindMany.mockReset().mockResolvedValue([]);
    mockTxArrTeamUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockTxArrangementUpdate.mockReset().mockResolvedValue({});
    mockTxTeamDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    mockTxTeamCreate.mockReset().mockResolvedValue({ id: "live-t1" });
    mockTxArrTeamUpdate.mockReset().mockResolvedValue({});
    mockTxMembershipCreateMany.mockReset().mockResolvedValue({ count: 0 });
  });

  test("deactivates all arrangements for the project", async () => {
    await caller.activate({ id: "arr-1" });

    expect(mockTxArrangementUpdateMany).toHaveBeenCalledWith({
      where: { projectId: "proj-1" },
      data: { isActive: false },
    });
  });

  test("clears liveTeamId on all arrangement teams", async () => {
    mockTxArrTeamFindMany.mockResolvedValue([{ id: "at-1" }, { id: "at-2" }]);

    await caller.activate({ id: "arr-1" });

    expect(mockTxArrTeamUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["at-1", "at-2"] } },
      data: { liveTeamId: null },
    });
  });

  test("skips liveTeamId clearing when no arrangement teams exist", async () => {
    mockTxArrTeamFindMany.mockResolvedValue([]);

    await caller.activate({ id: "arr-1" });

    expect(mockTxArrTeamUpdateMany).not.toHaveBeenCalled();
  });

  test("activates the target arrangement", async () => {
    await caller.activate({ id: "arr-1" });

    expect(mockTxArrangementUpdate).toHaveBeenCalledWith({
      where: { id: "arr-1" },
      data: { isActive: true },
    });
  });

  test("deletes all existing live teams", async () => {
    await caller.activate({ id: "arr-1" });

    expect(mockTxTeamDeleteMany).toHaveBeenCalledWith({
      where: { projectId: "proj-1" },
    });
  });

  test("creates live teams from arrangement teams", async () => {
    mockTxFindUniqueOrThrow.mockResolvedValue({
      projectId: "proj-1",
      teams: [
        { id: "at-1", name: "Alpha", sortOrder: 0, assignments: [] },
        { id: "at-2", name: "Beta", sortOrder: 1, assignments: [] },
      ],
    });
    mockTxTeamCreate
      .mockResolvedValueOnce({ id: "live-a" })
      .mockResolvedValueOnce({ id: "live-b" });

    await caller.activate({ id: "arr-1" });

    expect(mockTxTeamCreate).toHaveBeenCalledTimes(2);
    expect(mockTxTeamCreate).toHaveBeenCalledWith({
      data: { name: "Alpha", projectId: "proj-1" },
    });
    expect(mockTxTeamCreate).toHaveBeenCalledWith({
      data: { name: "Beta", projectId: "proj-1" },
    });
  });

  test("links arrangement teams to new live teams", async () => {
    mockTxFindUniqueOrThrow.mockResolvedValue({
      projectId: "proj-1",
      teams: [{ id: "at-1", name: "Alpha", sortOrder: 0, assignments: [] }],
    });
    mockTxTeamCreate.mockResolvedValueOnce({ id: "live-a" });

    await caller.activate({ id: "arr-1" });

    expect(mockTxArrTeamUpdate).toHaveBeenCalledWith({
      where: { id: "at-1" },
      data: { liveTeamId: "live-a" },
    });
  });

  test("creates team memberships for assigned members", async () => {
    mockTxFindUniqueOrThrow.mockResolvedValue({
      projectId: "proj-1",
      teams: [
        {
          id: "at-1",
          name: "Alpha",
          sortOrder: 0,
          assignments: [{ teamMemberId: "m1" }, { teamMemberId: "m2" }],
        },
      ],
    });
    mockTxTeamCreate.mockResolvedValueOnce({ id: "live-a" });

    await caller.activate({ id: "arr-1" });

    expect(mockTxMembershipCreateMany).toHaveBeenCalledWith({
      data: [
        { teamId: "live-a", teamMemberId: "m1" },
        { teamId: "live-a", teamMemberId: "m2" },
      ],
    });
  });

  test("skips createMany for teams with no assignments", async () => {
    mockTxFindUniqueOrThrow.mockResolvedValue({
      projectId: "proj-1",
      teams: [{ id: "at-1", name: "Alpha", sortOrder: 0, assignments: [] }],
    });
    mockTxTeamCreate.mockResolvedValueOnce({ id: "live-a" });

    await caller.activate({ id: "arr-1" });

    expect(mockTxMembershipCreateMany).not.toHaveBeenCalled();
  });
});
