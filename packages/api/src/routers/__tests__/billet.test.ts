import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

mock.module("../../lib/hierarchy", () => ({
  resolveClerkPerson: mock(() => Promise.resolve("person-1")),
  isInManagementChain: mock(() => Promise.resolve(false)),
  canViewMeetings: mock(() => Promise.resolve(false)),
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── DB mock ──────────────────────────────────────────────────

const mockBilletFindMany = mock(() => Promise.resolve([]));
const mockBilletCreate = mock(() =>
  Promise.resolve({
    id: "billet-1",
    projectId: "proj-1",
    departmentId: "dept-eng",
    titleId: null,
    level: "SENIOR",
    count: 2,
  }),
);
const mockBilletUpdate = mock(() =>
  Promise.resolve({
    id: "billet-1",
    projectId: "proj-1",
    departmentId: "dept-eng",
    titleId: "title-swe",
    level: "MID",
    count: 3,
  }),
);
const mockBilletDelete = mock(() => Promise.resolve({ id: "billet-1" }));

mock.module("@workspace/db", () => ({
  db: {
    billet: {
      findMany: mockBilletFindMany,
      create: mockBilletCreate,
      update: mockBilletUpdate,
      delete: mockBilletDelete,
    },
  },
}));

// ── Import router after mocks ──────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { billetRouter } = await import("../billet");

const createCaller = createCallerFactory(billetRouter);
const caller = createCaller({ userId: "test-user-id" });

// ── Tests ──────────────────────────────────────────────────

describe("billet.getByProjectId", () => {
  beforeEach(() => {
    mockBilletFindMany.mockReset().mockResolvedValue([]);
  });

  test("returns billets for a project", async () => {
    const mockBillets = [
      {
        id: "billet-1",
        level: "SENIOR",
        count: 2,
        department: { id: "dept-eng", name: "Engineering", color: "#3B82F6" },
        title: null,
      },
    ];
    mockBilletFindMany.mockResolvedValue(mockBillets);

    const result = await caller.getByProjectId({ projectId: "proj-1" });
    expect(result).toEqual(mockBillets);
    expect(mockBilletFindMany).toHaveBeenCalledWith({
      where: { projectId: "proj-1" },
      include: {
        department: { select: { id: true, name: true, color: true } },
        title: { select: { id: true, name: true } },
      },
      orderBy: [{ department: { name: "asc" } }, { level: "asc" }],
    });
  });

  test("returns empty array when no billets exist", async () => {
    const result = await caller.getByProjectId({ projectId: "proj-1" });
    expect(result).toEqual([]);
  });
});

describe("billet.create", () => {
  beforeEach(() => {
    mockBilletCreate.mockReset().mockResolvedValue({
      id: "billet-1",
      projectId: "proj-1",
      departmentId: "dept-eng",
      titleId: null,
      level: "SENIOR",
      count: 2,
    });
  });

  test("creates a billet without title", async () => {
    const result = await caller.create({
      projectId: "proj-1",
      departmentId: "dept-eng",
      level: "SENIOR",
      count: 2,
    });
    expect(result.id).toBe("billet-1");
    expect(mockBilletCreate).toHaveBeenCalledWith({
      data: {
        projectId: "proj-1",
        departmentId: "dept-eng",
        titleId: null,
        level: "SENIOR",
        count: 2,
      },
    });
  });

  test("creates a billet with title", async () => {
    await caller.create({
      projectId: "proj-1",
      departmentId: "dept-eng",
      titleId: "title-swe",
      level: "MID",
      count: 1,
    });
    expect(mockBilletCreate).toHaveBeenCalledWith({
      data: {
        projectId: "proj-1",
        departmentId: "dept-eng",
        titleId: "title-swe",
        level: "MID",
        count: 1,
      },
    });
  });

  test("treats empty titleId as null", async () => {
    await caller.create({
      projectId: "proj-1",
      departmentId: "dept-eng",
      titleId: "",
      level: "JUNIOR",
      count: 1,
    });
    expect(mockBilletCreate).toHaveBeenCalledWith({
      data: {
        projectId: "proj-1",
        departmentId: "dept-eng",
        titleId: null,
        level: "JUNIOR",
        count: 1,
      },
    });
  });

  test("rejects count less than 1", async () => {
    await expect(
      caller.create({
        projectId: "proj-1",
        departmentId: "dept-eng",
        level: "SENIOR",
        count: 0,
      }),
    ).rejects.toThrow();
  });

  test("rejects invalid level", async () => {
    await expect(
      caller.create({
        projectId: "proj-1",
        departmentId: "dept-eng",
        // @ts-expect-error — intentionally testing invalid input
        level: "INVALID",
        count: 1,
      }),
    ).rejects.toThrow();
  });
});

describe("billet.update", () => {
  beforeEach(() => {
    mockBilletUpdate.mockReset().mockResolvedValue({
      id: "billet-1",
      projectId: "proj-1",
      departmentId: "dept-eng",
      titleId: "title-swe",
      level: "MID",
      count: 3,
    });
  });

  test("updates a billet", async () => {
    const result = await caller.update({
      id: "billet-1",
      departmentId: "dept-eng",
      titleId: "title-swe",
      level: "MID",
      count: 3,
    });
    expect(result.id).toBe("billet-1");
    expect(mockBilletUpdate).toHaveBeenCalledWith({
      where: { id: "billet-1" },
      data: {
        departmentId: "dept-eng",
        titleId: "title-swe",
        level: "MID",
        count: 3,
      },
    });
  });

  test("clears title when titleId is empty string", async () => {
    await caller.update({
      id: "billet-1",
      departmentId: "dept-eng",
      titleId: "",
      level: "SENIOR",
      count: 1,
    });
    expect(mockBilletUpdate).toHaveBeenCalledWith({
      where: { id: "billet-1" },
      data: {
        departmentId: "dept-eng",
        titleId: null,
        level: "SENIOR",
        count: 1,
      },
    });
  });
});

describe("billet.delete", () => {
  beforeEach(() => {
    mockBilletDelete.mockReset().mockResolvedValue({ id: "billet-1" });
  });

  test("deletes a billet by id", async () => {
    await caller.delete({ id: "billet-1" });
    expect(mockBilletDelete).toHaveBeenCalledWith({
      where: { id: "billet-1" },
    });
  });
});
