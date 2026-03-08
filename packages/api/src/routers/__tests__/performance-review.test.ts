import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mocks ────────────────────────────────────────────────────

const mockResolveClerkPerson = mock(() => Promise.resolve("person-1" as string | null));
const mockIsDirectManager = mock(() => Promise.resolve(false));
const mockIsInManagementChain = mock(() => Promise.resolve(false));

mock.module("../../lib/hierarchy", () => ({
  resolveClerkPerson: mockResolveClerkPerson,
  isDirectManager: mockIsDirectManager,
  isInManagementChain: mockIsInManagementChain,
}));

mock.module("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({ userId: "clerk-user-1" }),
}));

// ── DB Mocks ─────────────────────────────────────────────────

const mockReviewFindMany = mock(() => Promise.resolve([] as unknown[]));
const mockReviewFindUnique = mock(() => Promise.resolve(null as unknown));
const mockReviewCreate = mock(() => Promise.resolve({ id: "review-1" } as unknown));
const mockReviewUpdate = mock(() => Promise.resolve({ id: "review-1" } as unknown));
const mockReviewDelete = mock(() => Promise.resolve({ id: "review-1" } as unknown));

mock.module("@workspace/db", () => ({
  db: {
    performanceReview: {
      findMany: mockReviewFindMany,
      findUnique: mockReviewFindUnique,
      create: mockReviewCreate,
      update: mockReviewUpdate,
      delete: mockReviewDelete,
    },
  },
}));

// ── Import router + create caller ────────────────────────────

const { performanceReviewRouter } = await import("../performance-review");
const { createCallerFactory } = await import("../../trpc");

const createCaller = createCallerFactory(performanceReviewRouter);
const caller = createCaller({ userId: "clerk-user-1" });

// ── Helpers ──────────────────────────────────────────────────

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: "review-1",
    personId: "person-1",
    authorId: "clerk-user-1",
    cycleLabel: "H1 2025",
    reviewDate: new Date("2025-06-01"),
    coreCompetencyScore: 4,
    teamworkScore: 3.5,
    innovationScore: 4.5,
    timeManagementScore: 3,
    coreCompetencyComments: null,
    teamworkComments: null,
    innovationComments: null,
    timeManagementComments: null,
    pdfUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const validInput = {
  cycleLabel: "H1 2025",
  reviewDate: new Date("2025-06-01"),
  coreCompetencyScore: 4,
  teamworkScore: 3.5,
  innovationScore: 4.5,
  timeManagementScore: 3,
};

// ── Tests ────────────────────────────────────────────────────

describe("performanceReview.listMine", () => {
  beforeEach(() => {
    mockResolveClerkPerson.mockReset().mockResolvedValue("person-1");
    mockReviewFindMany.mockReset().mockResolvedValue([]);
  });

  test("returns reviews for the caller's person", async () => {
    const reviews = [makeReview()];
    mockReviewFindMany.mockResolvedValue(reviews);

    const result = await caller.listMine();

    expect(result).toEqual(reviews);
    const callArgs = mockReviewFindMany.mock.calls[0]?.[0] as { where?: { personId?: string } };
    expect(callArgs?.where?.personId).toBe("person-1");
  });

  test("returns empty array when caller has no person record", async () => {
    mockResolveClerkPerson.mockResolvedValue(null);

    const result = await caller.listMine();

    expect(result).toEqual([]);
    expect(mockReviewFindMany).not.toHaveBeenCalled();
  });
});

describe("performanceReview.getByPersonId", () => {
  beforeEach(() => {
    mockResolveClerkPerson.mockReset().mockResolvedValue("person-1");
    mockIsInManagementChain.mockReset().mockResolvedValue(false);
    mockReviewFindMany.mockReset().mockResolvedValue([]);
  });

  test("returns reviews when viewing own data", async () => {
    const reviews = [makeReview()];
    mockReviewFindMany.mockResolvedValue(reviews);

    const result = await caller.getByPersonId({ personId: "person-1" });

    expect(result).toEqual(reviews);
    expect(mockIsInManagementChain).not.toHaveBeenCalled();
  });

  test("returns reviews when caller is in management chain", async () => {
    mockIsInManagementChain.mockResolvedValue(true);
    const reviews = [makeReview({ personId: "person-2" })];
    mockReviewFindMany.mockResolvedValue(reviews);

    const result = await caller.getByPersonId({ personId: "person-2" });

    expect(result).toEqual(reviews);
  });

  test("throws FORBIDDEN when caller is not in management chain", async () => {
    mockIsInManagementChain.mockResolvedValue(false);

    await expect(caller.getByPersonId({ personId: "person-2" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("performanceReview.getById", () => {
  beforeEach(() => {
    mockResolveClerkPerson.mockReset().mockResolvedValue("person-1");
    mockIsInManagementChain.mockReset().mockResolvedValue(false);
    mockReviewFindUnique.mockReset().mockResolvedValue(null);
  });

  test("returns review when viewing own review", async () => {
    const review = makeReview();
    mockReviewFindUnique.mockResolvedValue(review);

    const result = await caller.getById({ id: "review-1" });

    expect(result).toEqual(review);
  });

  test("returns review when caller is in management chain", async () => {
    const review = makeReview({ personId: "person-2" });
    mockReviewFindUnique.mockResolvedValue(review);
    mockIsInManagementChain.mockResolvedValue(true);

    const result = await caller.getById({ id: "review-1" });

    expect(result).toEqual(review);
  });

  test("throws NOT_FOUND when review does not exist", async () => {
    mockReviewFindUnique.mockResolvedValue(null);

    await expect(caller.getById({ id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("throws FORBIDDEN when caller is not in management chain", async () => {
    const review = makeReview({ personId: "person-2" });
    mockReviewFindUnique.mockResolvedValue(review);
    mockIsInManagementChain.mockResolvedValue(false);

    await expect(caller.getById({ id: "review-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("performanceReview.create", () => {
  beforeEach(() => {
    mockResolveClerkPerson.mockReset().mockResolvedValue("person-1");
    mockIsDirectManager.mockReset().mockResolvedValue(false);
    mockReviewCreate.mockReset().mockResolvedValue(makeReview());
  });

  test("creates review for self when no personId given", async () => {
    const result = await caller.create(validInput);

    expect(result).toBeDefined();
    const callArgs = mockReviewCreate.mock.calls[0]?.[0] as { data?: { personId?: string } };
    expect(callArgs?.data?.personId).toBe("person-1");
  });

  test("creates review for another person when caller is direct manager", async () => {
    mockIsDirectManager.mockResolvedValue(true);

    await caller.create({ ...validInput, personId: "person-2" });

    const callArgs = mockReviewCreate.mock.calls[0]?.[0] as { data?: { personId?: string } };
    expect(callArgs?.data?.personId).toBe("person-2");
  });

  test("throws FORBIDDEN when creating for non-report", async () => {
    mockIsDirectManager.mockResolvedValue(false);

    await expect(caller.create({ ...validInput, personId: "person-2" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("throws BAD_REQUEST when caller has no person record", async () => {
    mockResolveClerkPerson.mockResolvedValue(null);

    await expect(caller.create(validInput)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  test("throws CONFLICT on duplicate cycle label", async () => {
    const prismaError = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    mockReviewCreate.mockRejectedValue(prismaError);

    await expect(caller.create(validInput)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  test("includes pdfUrl in created data", async () => {
    await caller.create({ ...validInput, pdfUrl: "https://example.com/review.pdf" });

    const callArgs = mockReviewCreate.mock.calls[0]?.[0] as { data?: { pdfUrl?: string } };
    expect(callArgs?.data?.pdfUrl).toBe("https://example.com/review.pdf");
  });
});

describe("performanceReview.update", () => {
  beforeEach(() => {
    mockResolveClerkPerson.mockReset().mockResolvedValue("person-1");
    mockIsDirectManager.mockReset().mockResolvedValue(false);
    mockReviewFindUnique.mockReset().mockResolvedValue({ personId: "person-1" });
    mockReviewUpdate.mockReset().mockResolvedValue(makeReview());
  });

  test("updates own review", async () => {
    const result = await caller.update({ id: "review-1", ...validInput });

    expect(result).toBeDefined();
    expect(mockReviewUpdate).toHaveBeenCalled();
  });

  test("updates report's review when caller is direct manager", async () => {
    mockReviewFindUnique.mockResolvedValue({ personId: "person-2" });
    mockIsDirectManager.mockResolvedValue(true);

    const result = await caller.update({ id: "review-1", ...validInput });

    expect(result).toBeDefined();
  });

  test("throws NOT_FOUND when review does not exist", async () => {
    mockReviewFindUnique.mockResolvedValue(null);

    await expect(caller.update({ id: "nonexistent", ...validInput })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("throws FORBIDDEN when not owner or manager", async () => {
    mockReviewFindUnique.mockResolvedValue({ personId: "person-2" });
    mockIsDirectManager.mockResolvedValue(false);

    await expect(caller.update({ id: "review-1", ...validInput })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("throws CONFLICT on duplicate cycle label", async () => {
    const prismaError = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    mockReviewUpdate.mockRejectedValue(prismaError);

    await expect(caller.update({ id: "review-1", ...validInput })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  test("omits pdfUrl from update when not provided", async () => {
    await caller.update({ id: "review-1", ...validInput });

    const callArgs = mockReviewUpdate.mock.calls[0]?.[0] as { data?: Record<string, unknown> };
    expect(callArgs?.data).not.toHaveProperty("pdfUrl");
  });

  test("sets pdfUrl to null when explicitly passed as null", async () => {
    await caller.update({ id: "review-1", ...validInput, pdfUrl: null });

    const callArgs = mockReviewUpdate.mock.calls[0]?.[0] as { data?: { pdfUrl?: string | null } };
    expect(callArgs?.data?.pdfUrl).toBeNull();
  });
});

describe("performanceReview.delete", () => {
  beforeEach(() => {
    mockResolveClerkPerson.mockReset().mockResolvedValue("person-1");
    mockIsDirectManager.mockReset().mockResolvedValue(false);
    mockReviewFindUnique.mockReset().mockResolvedValue({ personId: "person-1" });
    mockReviewDelete.mockReset().mockResolvedValue({ id: "review-1" });
  });

  test("deletes own review", async () => {
    await caller.delete({ id: "review-1" });

    expect(mockReviewDelete).toHaveBeenCalled();
  });

  test("deletes report's review when caller is direct manager", async () => {
    mockReviewFindUnique.mockResolvedValue({ personId: "person-2" });
    mockIsDirectManager.mockResolvedValue(true);

    await caller.delete({ id: "review-1" });

    expect(mockReviewDelete).toHaveBeenCalled();
  });

  test("throws NOT_FOUND when review does not exist", async () => {
    mockReviewFindUnique.mockResolvedValue(null);

    await expect(caller.delete({ id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("throws FORBIDDEN when not owner or manager", async () => {
    mockReviewFindUnique.mockResolvedValue({ personId: "person-2" });
    mockIsDirectManager.mockResolvedValue(false);

    await expect(caller.delete({ id: "review-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("throws FORBIDDEN when caller has no person record", async () => {
    mockResolveClerkPerson.mockResolvedValue(null);

    await expect(caller.delete({ id: "review-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
