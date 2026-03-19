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

const mockGlossaryFindMany = mock(() => Promise.resolve([]));
const mockGlossaryCreate = mock(() =>
  Promise.resolve({
    id: "entry-1",
    projectId: "proj-1",
    term: "Sprint",
    definition: "A short iteration.",
  }),
);
const mockGlossaryUpdate = mock(() =>
  Promise.resolve({ id: "entry-1", projectId: "proj-1", term: "Sprint", definition: "Updated." }),
);
const mockGlossaryDelete = mock(() => Promise.resolve({ id: "entry-1" }));

mock.module("@workspace/db", () => ({
  db: {
    glossaryEntry: {
      findMany: mockGlossaryFindMany,
      create: mockGlossaryCreate,
      update: mockGlossaryUpdate,
      delete: mockGlossaryDelete,
    },
  },
}));

// ── Import router + create caller ────────────────────────────

const { createCallerFactory } = await import("../../trpc");
const { glossaryRouter } = await import("../glossary");

const createCaller = createCallerFactory(glossaryRouter);
const caller = createCaller({
  userId: "test-user-id",
  personId: "person-1",
  access: {
    personId: "person-1",
    capabilities: new Set(["admin:access"]),
    projectCapabilities: new Map(),
    isAdmin: true,
  },
});

// ── Tests ────────────────────────────────────────────────────

describe("glossary.getByProjectId", () => {
  beforeEach(() => {
    mockGlossaryFindMany.mockReset().mockResolvedValue([]);
  });

  test("returns entries for a project", async () => {
    const entries = [
      { id: "e-1", term: "Sprint", definition: "A short iteration." },
      { id: "e-2", term: "Velocity", definition: "Points completed per sprint." },
    ];
    mockGlossaryFindMany.mockResolvedValue(entries);

    const result = await caller.getByProjectId({ projectId: "proj-1" });

    expect(result).toEqual(entries);
  });

  test("queries by projectId with terms sorted ascending", async () => {
    await caller.getByProjectId({ projectId: "proj-alpha" });

    const callArgs = mockGlossaryFindMany.mock.calls[0]?.[0] as {
      where?: { projectId: string };
      orderBy?: { term: string };
    };
    expect(callArgs.where).toEqual({ projectId: "proj-alpha" });
    expect(callArgs.orderBy).toEqual({ term: "asc" });
  });

  test("returns empty array when project has no entries", async () => {
    const result = await caller.getByProjectId({ projectId: "proj-empty" });
    expect(result).toEqual([]);
  });
});

describe("glossary.create", () => {
  beforeEach(() => {
    mockGlossaryCreate.mockReset().mockResolvedValue({
      id: "entry-1",
      projectId: "proj-1",
      term: "Sprint",
      definition: "A short iteration.",
    });
  });

  test("creates and returns the new entry", async () => {
    const result = await caller.create({
      projectId: "proj-1",
      term: "Sprint",
      definition: "A short iteration.",
    });

    expect(result.id).toBe("entry-1");
    expect(result.term).toBe("Sprint");
  });

  test("persists term and definition via db.create", async () => {
    await caller.create({
      projectId: "proj-1",
      term: "Sprint",
      definition: "A short iteration.",
    });

    const callArgs = mockGlossaryCreate.mock.calls[0]?.[0] as {
      data?: { projectId: string; term: string; definition: string };
    };
    expect(callArgs.data).toEqual({
      projectId: "proj-1",
      term: "Sprint",
      definition: "A short iteration.",
    });
  });

  test("rejects term longer than 200 characters", async () => {
    await expect(
      caller.create({
        projectId: "proj-1",
        term: "x".repeat(201),
        definition: "Valid definition.",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("rejects definition longer than 2000 characters", async () => {
    await expect(
      caller.create({
        projectId: "proj-1",
        term: "Valid term",
        definition: "x".repeat(2001),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("rejects empty term", async () => {
    await expect(
      caller.create({ projectId: "proj-1", term: "", definition: "Valid." }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("glossary.update", () => {
  beforeEach(() => {
    mockGlossaryUpdate.mockReset().mockResolvedValue({
      id: "entry-1",
      projectId: "proj-1",
      term: "Sprint",
      definition: "Updated definition.",
    });
  });

  test("updates and returns the entry", async () => {
    const result = await caller.update({
      id: "entry-1",
      term: "Sprint",
      definition: "Updated definition.",
    });

    expect(result.id).toBe("entry-1");
    expect(result.definition).toBe("Updated definition.");
  });

  test("passes id as where clause and term/definition as data", async () => {
    await caller.update({
      id: "entry-1",
      term: "Velocity",
      definition: "Points per sprint.",
    });

    const callArgs = mockGlossaryUpdate.mock.calls[0]?.[0] as {
      where?: { id: string };
      data?: { term: string; definition: string };
    };
    expect(callArgs.where).toEqual({ id: "entry-1" });
    expect(callArgs.data).toEqual({ term: "Velocity", definition: "Points per sprint." });
  });

  test("rejects empty definition", async () => {
    await expect(
      caller.update({ id: "entry-1", term: "Sprint", definition: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("glossary.delete", () => {
  beforeEach(() => {
    mockGlossaryDelete.mockReset().mockResolvedValue({ id: "entry-1" });
  });

  test("deletes the entry by id", async () => {
    await caller.delete({ id: "entry-1" });

    const callArgs = mockGlossaryDelete.mock.calls[0]?.[0] as {
      where?: { id: string };
    };
    expect(callArgs.where).toEqual({ id: "entry-1" });
  });

  test("returns the deleted entry", async () => {
    const result = await caller.delete({ id: "entry-1" });
    expect(result).toEqual({ id: "entry-1" });
  });
});
