import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

const mockResolveClerkPerson = mock(() => Promise.resolve("person-1"));

mock.module("../../lib/hierarchy", () => ({
  resolveClerkPerson: mockResolveClerkPerson,
  isInManagementChain: mock(() => Promise.resolve(false)),
  canViewMeetings: mock(() => Promise.resolve(false)),
}));

mock.module("../../lib/roadmap-hierarchy", () => ({
  detectProjectCycle: mock(() => Promise.resolve(false)),
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── DB mock ──────────────────────────────────────────────────

const mockProjectFindMany = mock(() => Promise.resolve([]));
const mockProjectCount = mock(() => Promise.resolve(0));

mock.module("@workspace/db", () => ({
  db: {
    project: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mockProjectFindMany,
      create: mock(() => Promise.resolve({ id: "new-proj" })),
      update: mock(() => Promise.resolve({ id: "proj-1" })),
      delete: mock(() => Promise.resolve({})),
      count: mockProjectCount,
    },
    favoriteProject: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: "fav-1" })),
      delete: mock(() => Promise.resolve({})),
    },
    $transaction: mock((fn: (tx: unknown) => unknown) => fn({})),
  },
}));

// ── Import router + create caller ────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { projectRouter } = await import("../project");

const createCaller = createCallerFactory(projectRouter);
const caller = createCaller({ userId: "test-user-id" });

// ── Tests ────────────────────────────────────────────────────

describe("project.list", () => {
  beforeEach(() => {
    mockProjectFindMany.mockReset().mockResolvedValue([]);
    mockProjectCount.mockReset().mockResolvedValue(0);
    mockResolveClerkPerson.mockReset().mockResolvedValue("person-1");
  });

  test("returns paginated results with totalCount", async () => {
    const items = [{ id: "proj-1", name: "Alpha" }];
    mockProjectFindMany.mockResolvedValue(items);
    mockProjectCount.mockResolvedValue(5);

    const result = await caller.list({ page: 1, pageSize: 10 });

    expect(result.items).toEqual(items);
    expect(result.totalCount).toBe(5);
  });

  test("applies skip/take for pagination", async () => {
    await caller.list({ page: 2, pageSize: 5 });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      skip?: number;
      take?: number;
    };
    expect(callArgs.skip).toBe(5); // (2-1) * 5
    expect(callArgs.take).toBe(5);
  });

  test("applies search filter on name", async () => {
    await caller.list({ page: 1, pageSize: 10, search: "alpha" });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: { name?: { contains: string; mode: string } };
    };
    expect(callArgs.where?.name).toEqual({
      contains: "alpha",
      mode: "insensitive",
    });
  });

  test("applies status filter for real statuses", async () => {
    await caller.list({ page: 1, pageSize: 10, status: ["GREEN", "RED"] });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: { OR?: object[] };
    };
    expect(callArgs.where?.OR).toEqual([
      {
        healthAssessments: {
          some: { overallStatus: { in: ["GREEN", "RED"] } },
        },
      },
    ]);
  });

  test("applies status filter for NONE (no health assessments)", async () => {
    await caller.list({ page: 1, pageSize: 10, status: ["NONE"] });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: { OR?: object[] };
    };
    expect(callArgs.where?.OR).toEqual([{ healthAssessments: { none: {} } }]);
  });

  test("combines real statuses and NONE in OR clause", async () => {
    await caller.list({
      page: 1,
      pageSize: 10,
      status: ["GREEN", "NONE"],
    });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: { OR?: object[] };
    };
    expect(callArgs.where?.OR).toEqual([
      { healthAssessments: { some: { overallStatus: { in: ["GREEN"] } } } },
      { healthAssessments: { none: {} } },
    ]);
  });

  test("does NOT add status to where when array is empty or undefined", async () => {
    await caller.list({ page: 1, pageSize: 10 });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: Record<string, unknown>;
    };
    expect(callArgs.where?.OR).toBeUndefined();
  });

  test("combines search and status filters", async () => {
    await caller.list({
      page: 1,
      pageSize: 10,
      search: "alpha",
      status: ["YELLOW"],
    });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: {
        name?: { contains: string; mode: string };
        OR?: object[];
      };
    };
    expect(callArgs.where?.name).toEqual({
      contains: "alpha",
      mode: "insensitive",
    });
    expect(callArgs.where?.OR).toEqual([
      { healthAssessments: { some: { overallStatus: { in: ["YELLOW"] } } } },
    ]);
  });

  test("sorts by updatedAt descending by default", async () => {
    await caller.list({ page: 1, pageSize: 10 });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      orderBy?: object;
    };
    expect(callArgs.orderBy).toEqual({ updatedAt: "desc" });
  });

  test("sorts by name ascending", async () => {
    await caller.list({
      page: 1,
      pageSize: 10,
      sortBy: "name",
      sortOrder: "asc",
    });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      orderBy?: object;
    };
    expect(callArgs.orderBy).toEqual({ name: "asc" });
  });

  test("filters for top-level projects only (parentId is null)", async () => {
    await caller.list({ page: 1, pageSize: 10, type: ["toplevel"] });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: { parentId?: unknown };
    };
    expect(callArgs.where?.parentId).toBeNull();
  });

  test("filters for sub-projects only (parentId is not null)", async () => {
    await caller.list({ page: 1, pageSize: 10, type: ["subproject"] });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: { parentId?: { not: null } };
    };
    expect(callArgs.where?.parentId).toEqual({ not: null });
  });

  test("does not filter parentId when both toplevel and subproject selected", async () => {
    await caller.list({
      page: 1,
      pageSize: 10,
      type: ["toplevel", "subproject"],
    });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: Record<string, unknown>;
    };
    expect(callArgs.where?.parentId).toBeUndefined();
  });

  test("composes type filter with status filter", async () => {
    await caller.list({
      page: 1,
      pageSize: 10,
      type: ["toplevel"],
      status: ["GREEN"],
    });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: { parentId?: unknown; OR?: object[] };
    };
    expect(callArgs.where?.parentId).toBeNull();
    expect(callArgs.where?.OR).toEqual([
      {
        healthAssessments: {
          some: { overallStatus: { in: ["GREEN"] } },
        },
      },
    ]);
  });

  test("favorite filter adds favoritedBy where clause", async () => {
    await caller.list({ page: 1, pageSize: 10, favorite: true });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: { favoritedBy?: { some: { personId: string } } };
    };
    expect(callArgs.where?.favoritedBy).toEqual({
      some: { personId: "person-1" },
    });
  });

  test("favorite filter returns empty when no linked person", async () => {
    mockResolveClerkPerson.mockResolvedValue(null);

    const result = await caller.list({ page: 1, pageSize: 10, favorite: true });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(mockProjectFindMany).not.toHaveBeenCalled();
  });

  test("favorite filter composes with search and status", async () => {
    await caller.list({
      page: 1,
      pageSize: 10,
      favorite: true,
      search: "alpha",
      status: ["GREEN"],
    });

    const callArgs = mockProjectFindMany.mock.calls[0]?.[0] as {
      where?: {
        name?: { contains: string; mode: string };
        OR?: object[];
        favoritedBy?: { some: { personId: string } };
      };
    };
    expect(callArgs.where?.name).toEqual({
      contains: "alpha",
      mode: "insensitive",
    });
    expect(callArgs.where?.OR).toEqual([
      { healthAssessments: { some: { overallStatus: { in: ["GREEN"] } } } },
    ]);
    expect(callArgs.where?.favoritedBy).toEqual({
      some: { personId: "person-1" },
    });
  });
});
