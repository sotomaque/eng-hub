import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

const mockCanViewMeetings = mock(() => Promise.resolve(false));
mock.module("../../lib/hierarchy", () => ({
  canViewMeetings: mockCanViewMeetings,
  resolveClerkPerson: mock(() => Promise.resolve("person-1" as string | null)),
  isInManagementChain: mock(() => Promise.resolve(false)),
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "clerk-user-1" }),
}));

// ── DB Mocks ─────────────────────────────────────────────────

const mockPersonFindUnique = mock(() => Promise.resolve(null as unknown));
const mockMeetingFindMany = mock(() => Promise.resolve([] as unknown[]));
const mockMeetingFindUnique = mock(() => Promise.resolve(null as unknown));
const mockMeetingCreate = mock(() => Promise.resolve({ id: "meeting-1" } as unknown));

mock.module("@workspace/db", () => ({
  db: {
    person: { findUnique: mockPersonFindUnique },
    meeting: {
      findMany: mockMeetingFindMany,
      findUnique: mockMeetingFindUnique,
      create: mockMeetingCreate,
    },
    $queryRaw: mock(() => Promise.resolve([])),
  },
}));

// ── Import router + create caller ────────────────────────────

const { meetingRouter } = await import("../meeting");
const { createCallerFactory } = await import("../../trpc");

const createCaller = createCallerFactory(meetingRouter);
const caller = createCaller({
  userId: "clerk-user-1",
  personId: "person-1",
  access: {
    personId: "person-1",
    capabilities: new Set(["admin:access"]),
    projectCapabilities: new Map(),
    isAdmin: true,
  },
});

// Restricted caller — non-admin, no capabilities
const restrictedCaller = createCaller({
  userId: "other-user",
  personId: "person-2",
  access: {
    personId: "person-2",
    capabilities: new Set<string>(),
    projectCapabilities: new Map<string, Set<string>>(),
    isAdmin: false,
  },
});

// ── Helpers ──────────────────────────────────────────────────

function makeMeeting(overrides: Record<string, unknown> = {}) {
  return {
    id: "meeting-1",
    date: new Date("2025-03-01"),
    content: { notes: "test" },
    authorId: "clerk-user-1",
    personId: "person-1",
    templateId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    person: {
      id: "person-1",
      firstName: "Jane",
      lastName: "Doe",
      callsign: null,
      imageUrl: null,
    },
    template: null,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe("meeting.create", () => {
  beforeEach(() => {
    mockPersonFindUnique.mockReset();
    mockMeetingCreate.mockReset().mockResolvedValue({ id: "meeting-1" });
  });

  test("succeeds when person is viewer's direct report", async () => {
    // First call: viewer lookup, second call: reportee lookup
    mockPersonFindUnique
      .mockResolvedValueOnce({ id: "viewer-person-id" })
      .mockResolvedValueOnce({ managerId: "viewer-person-id" });

    const result = await caller.create({
      personId: "person-1",
      date: new Date("2025-03-01"),
      content: { notes: "test" },
    });

    expect(result.id).toBe("meeting-1");
  });
});

describe("meeting.getByPersonId", () => {
  beforeEach(() => {
    mockCanViewMeetings.mockReset();
    mockMeetingFindMany.mockReset().mockResolvedValue([]);
  });

  test("returns meetings when canViewMeetings returns true", async () => {
    mockCanViewMeetings.mockResolvedValue(true);
    const meetings = [makeMeeting()];
    mockMeetingFindMany.mockResolvedValue(meetings);

    const result = await caller.getByPersonId({ personId: "person-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("meeting-1");
  });

  test("throws FORBIDDEN when caller lacks access to another person's meetings", async () => {
    await expect(restrictedCaller.getByPersonId({ personId: "person-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("meeting.getById", () => {
  beforeEach(() => {
    mockCanViewMeetings.mockReset();
    mockMeetingFindUnique.mockReset();
  });

  test("returns meeting when viewer is the author (no chain check)", async () => {
    mockMeetingFindUnique.mockResolvedValue(makeMeeting({ authorId: "clerk-user-1" }));

    const result = await caller.getById({ id: "meeting-1" });

    expect(result.id).toBe("meeting-1");
    expect(mockCanViewMeetings).not.toHaveBeenCalled();
  });

  test("throws FORBIDDEN when viewer is not author AND lacks access", async () => {
    mockMeetingFindUnique.mockResolvedValue(
      makeMeeting({ authorId: "clerk-user-1", personId: "person-1" }),
    );

    await expect(restrictedCaller.getById({ id: "meeting-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("returns meeting when viewer is not author but has admin access", async () => {
    mockMeetingFindUnique.mockResolvedValue(makeMeeting({ authorId: "other-user" }));

    const result = await caller.getById({ id: "meeting-1" });

    expect(result.id).toBe("meeting-1");
  });

  test("throws NOT_FOUND when meeting does not exist", async () => {
    mockMeetingFindUnique.mockResolvedValue(null);

    await expect(caller.getById({ id: "nonexistent" })).rejects.toThrow(
      expect.objectContaining({
        code: "NOT_FOUND",
      }),
    );
  });
});
