import { beforeEach, describe, expect, mock, test } from "bun:test";
import { TRPCError } from "@trpc/server";

// ── Mocks ────────────────────────────────────────────────────

const mockCanViewMeetings = mock(() => Promise.resolve(false));
mock.module("../../lib/hierarchy", () => ({
  canViewMeetings: mockCanViewMeetings,
  resolveClerkPerson: mock(() => Promise.resolve("person-1" as string | null)),
  isInManagementChain: mock(() => Promise.resolve(false)),
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
  auth: () => Promise.resolve({ userId: "clerk-user-1" }),
}));

// ── DB Mocks ─────────────────────────────────────────────────

const mockPersonFindUnique = mock(() => Promise.resolve(null as unknown));
const mockMeetingFindMany = mock(() => Promise.resolve([] as unknown[]));
const mockMeetingFindUnique = mock(() => Promise.resolve(null as unknown));
const mockMeetingCreate = mock(() =>
  Promise.resolve({ id: "meeting-1" } as unknown),
);

mock.module("@workspace/db", () => ({
  db: {
    person: { findUnique: mockPersonFindUnique },
    meeting: {
      findMany: mockMeetingFindMany,
      findUnique: mockMeetingFindUnique,
      create: mockMeetingCreate,
    },
  },
}));

// ── Import router + create caller ────────────────────────────

const { meetingRouter } = await import("../meeting");
const { createCallerFactory } = await import("../../trpc");

const createCaller = createCallerFactory(meetingRouter);
const caller = createCaller({ userId: "clerk-user-1" });

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

  test("throws BAD_REQUEST when viewer has no claimed Person record", async () => {
    mockPersonFindUnique
      .mockResolvedValueOnce(null) // viewer not found
      .mockResolvedValueOnce({ managerId: "someone" });

    await expect(
      caller.create({
        personId: "person-1",
        date: new Date("2025-03-01"),
        content: {},
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
      }),
    );
  });

  test("throws FORBIDDEN when reportee not found", async () => {
    mockPersonFindUnique
      .mockResolvedValueOnce({ id: "viewer-person-id" })
      .mockResolvedValueOnce(null); // reportee not found

    await expect(
      caller.create({
        personId: "person-1",
        date: new Date("2025-03-01"),
        content: {},
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
      }),
    );
  });

  test("throws FORBIDDEN when person is NOT viewer's direct report", async () => {
    mockPersonFindUnique
      .mockResolvedValueOnce({ id: "viewer-person-id" })
      .mockResolvedValueOnce({ managerId: "some-other-manager" });

    await expect(
      caller.create({
        personId: "person-1",
        date: new Date("2025-03-01"),
        content: {},
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
      }),
    );
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

  test("returns null when canViewMeetings returns false", async () => {
    mockCanViewMeetings.mockResolvedValue(false);

    const result = await caller.getByPersonId({ personId: "person-1" });
    expect(result).toBeNull();
  });
});

describe("meeting.getById", () => {
  beforeEach(() => {
    mockCanViewMeetings.mockReset();
    mockMeetingFindUnique.mockReset();
  });

  test("returns meeting when viewer is the author (no chain check)", async () => {
    mockMeetingFindUnique.mockResolvedValue(
      makeMeeting({ authorId: "clerk-user-1" }),
    );

    const result = await caller.getById({ id: "meeting-1" });

    expect(result.id).toBe("meeting-1");
    expect(mockCanViewMeetings).not.toHaveBeenCalled();
  });

  test("throws FORBIDDEN when viewer is not author AND not in chain", async () => {
    mockMeetingFindUnique.mockResolvedValue(
      makeMeeting({ authorId: "other-user" }),
    );
    mockCanViewMeetings.mockResolvedValue(false);

    await expect(caller.getById({ id: "meeting-1" })).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
      }),
    );
  });

  test("returns meeting when viewer is not author but has chain access", async () => {
    mockMeetingFindUnique.mockResolvedValue(
      makeMeeting({ authorId: "other-user" }),
    );
    mockCanViewMeetings.mockResolvedValue(true);

    const result = await caller.getById({ id: "meeting-1" });

    expect(result.id).toBe("meeting-1");
    expect(mockCanViewMeetings).toHaveBeenCalledWith(
      "clerk-user-1",
      "person-1",
    );
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
