import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

const mockDetectProjectCycle = mock(() => Promise.resolve(false));

mock.module("../../lib/hierarchy", () => ({
  resolveClerkPerson: mock(() => Promise.resolve("person-1")),
  isInManagementChain: mock(() => Promise.resolve(false)),
  canViewMeetings: mock(() => Promise.resolve(false)),
}));

mock.module("../../lib/roadmap-hierarchy", () => ({
  detectProjectCycle: mockDetectProjectCycle,
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "test-user-id" }),
}));

// ── DB mock ──────────────────────────────────────────────────

const mockProjectFindUnique = mock(() =>
  Promise.resolve({ parentId: null, fundedById: null } as {
    parentId: string | null;
    fundedById: string | null;
  } | null),
);
const mockProjectUpdate = mock(() => Promise.resolve({ id: "proj-1" }));

mock.module("@workspace/db", () => ({
  db: {
    project: {
      findUnique: mockProjectFindUnique,
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: "new-proj" })),
      update: mockProjectUpdate,
      delete: mock(() => Promise.resolve({})),
      count: mock(() => Promise.resolve(0)),
    },
    favoriteProject: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: "fav-1" })),
      delete: mock(() => Promise.resolve({})),
    },
    projectOwner: {
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
      createMany: mock(() => Promise.resolve({ count: 0 })),
    },
    $transaction: mock((fn: (tx: unknown) => unknown) =>
      fn({
        projectOwner: {
          deleteMany: mock(() => Promise.resolve({ count: 0 })),
          createMany: mock(() => Promise.resolve({ count: 0 })),
        },
      }),
    ),
  },
}));

// ── Import router after mocks ──────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { projectRouter } = await import("../project");

const createCaller = createCallerFactory(projectRouter);
const caller = createCaller({ userId: "test-user-id" });

const validInput = {
  id: "proj-1",
  name: "Test Project",
};

// ── Tests ──────────────────────────────────────────────────

describe("project.update", () => {
  beforeEach(() => {
    mockDetectProjectCycle.mockReset().mockResolvedValue(false);
    mockProjectFindUnique
      .mockReset()
      .mockResolvedValue({ parentId: null, fundedById: null });
    mockProjectUpdate.mockReset().mockResolvedValue({ id: "proj-1" });
  });

  test("succeeds with basic update", async () => {
    const result = await caller.update(validInput);
    expect(result).toEqual({ id: "proj-1" });
  });

  test("throws BAD_REQUEST on self-reference via parentId", async () => {
    await expect(
      caller.update({ ...validInput, parentId: "proj-1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("cannot reference itself"),
    });
  });

  test("throws BAD_REQUEST on self-reference via fundedById", async () => {
    await expect(
      caller.update({ ...validInput, fundedById: "proj-1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("cannot reference itself"),
    });
  });

  test("throws BAD_REQUEST on parent cycle detection", async () => {
    mockDetectProjectCycle.mockResolvedValue(true);

    await expect(
      caller.update({ ...validInput, parentId: "parent-1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("circular"),
    });
  });

  test("allows setting parent when no cycle exists", async () => {
    const result = await caller.update({
      ...validInput,
      parentId: "parent-1",
    });
    expect(result).toEqual({ id: "proj-1" });
    expect(mockDetectProjectCycle).toHaveBeenCalledWith("proj-1", "parent-1");
  });

  test("skips cycle detection when parentId is empty", async () => {
    await caller.update({ ...validInput, parentId: "" });
    expect(mockDetectProjectCycle).not.toHaveBeenCalled();
  });
});

describe("project.setOwners", () => {
  test("sets owners via transaction", async () => {
    await caller.setOwners({
      projectId: "proj-1",
      personIds: ["person-a", "person-b"],
    });
    // No error means the transaction ran successfully
  });

  test("accepts empty personIds array to clear owners", async () => {
    await caller.setOwners({
      projectId: "proj-1",
      personIds: [],
    });
  });
});
