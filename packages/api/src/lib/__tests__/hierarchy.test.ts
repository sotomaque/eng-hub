import { beforeEach, describe, expect, mock, test } from "bun:test";

const mockFindUnique = mock(() =>
  Promise.resolve(null as { id?: string; managerId?: string | null } | null),
);

const mockGrantFindUnique = mock(() => Promise.resolve(null as { id: string } | null));

const mockQueryRaw = mock(() => Promise.resolve([] as { id: string }[]));

mock.module("@workspace/db", () => ({
  db: {
    person: {
      findUnique: mockFindUnique,
    },
    meetingVisibilityGrant: {
      findUnique: mockGrantFindUnique,
    },
    $queryRaw: mockQueryRaw,
  },
}));

const { isDirectManager, isInManagementChain, canViewMeetings } = await import("../hierarchy");

describe("isInManagementChain", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockGrantFindUnique.mockReset();
    mockQueryRaw.mockReset().mockResolvedValue([]);
  });

  test("returns false when clerk user has no person record", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await isInManagementChain("clerk-unknown", "person-1");
    expect(result).toBe(false);
  });

  test("returns true when viewer is in the management chain", async () => {
    // resolveClerkPerson → viewer-id
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // getManagementChain returns chain including viewer-id
    mockQueryRaw.mockResolvedValueOnce([{ id: "manager-a" }, { id: "viewer-id" }]);

    const result = await isInManagementChain("clerk-abc", "person-1");
    expect(result).toBe(true);
  });

  test("returns false when viewer is NOT in the management chain", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // getManagementChain returns chain without viewer-id
    mockQueryRaw.mockResolvedValueOnce([{ id: "manager-a" }]);

    const result = await isInManagementChain("clerk-abc", "person-1");
    expect(result).toBe(false);
  });

  test("returns false when person has no manager", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // getManagementChain returns empty chain
    mockQueryRaw.mockResolvedValueOnce([]);

    const result = await isInManagementChain("clerk-abc", "person-1");
    expect(result).toBe(false);
  });

  test("handles circular management chains gracefully", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // CTE returns the chain (LIMIT 50 handles cycles); viewer not in it
    mockQueryRaw.mockResolvedValueOnce([{ id: "manager-a" }, { id: "manager-b" }]);

    const result = await isInManagementChain("clerk-abc", "person-1");
    expect(result).toBe(false);
  });
});

describe("canViewMeetings", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockGrantFindUnique.mockReset();
    mockQueryRaw.mockReset().mockResolvedValue([]);
  });

  test("returns true when viewer is in management chain", async () => {
    // isInManagementChain: resolveClerkPerson → viewer-id
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // getManagementChain returns chain with viewer-id
    mockQueryRaw.mockResolvedValueOnce([{ id: "viewer-id" }]);

    const result = await canViewMeetings("clerk-abc", "person-1");
    expect(result).toBe(true);
    expect(mockGrantFindUnique).not.toHaveBeenCalled();
  });

  test("returns true via visibility grant when NOT in chain", async () => {
    // isInManagementChain: resolveClerkPerson → viewer-id
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // getManagementChain returns chain without viewer-id
    mockQueryRaw.mockResolvedValueOnce([{ id: "manager-a" }]);
    // canViewMeetings: resolveClerkPerson again → viewer-id
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // person lookup → has a manager
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-a" });
    // grant exists
    mockGrantFindUnique.mockResolvedValueOnce({ id: "grant-1" });

    const result = await canViewMeetings("clerk-abc", "person-1");
    expect(result).toBe(true);
  });

  test("returns false when not in chain AND no grant exists", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockQueryRaw.mockResolvedValueOnce([{ id: "manager-a" }]);
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-a" });
    mockGrantFindUnique.mockResolvedValueOnce(null);

    const result = await canViewMeetings("clerk-abc", "person-1");
    expect(result).toBe(false);
  });

  test("returns false when person has no manager", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockQueryRaw.mockResolvedValueOnce([]);
    // canViewMeetings: resolveClerkPerson again → viewer-id
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // person lookup → no manager
    mockFindUnique.mockResolvedValueOnce({ managerId: null });

    const result = await canViewMeetings("clerk-abc", "person-1");
    expect(result).toBe(false);
    expect(mockGrantFindUnique).not.toHaveBeenCalled();
  });

  test("returns false when viewer has no person record", async () => {
    // isInManagementChain: resolveClerkPerson returns null
    mockFindUnique.mockResolvedValueOnce(null);
    // canViewMeetings: resolveClerkPerson returns null
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await canViewMeetings("clerk-unknown", "person-1");
    expect(result).toBe(false);
    expect(mockGrantFindUnique).not.toHaveBeenCalled();
  });
});

describe("isDirectManager", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  test("returns false when clerk user has no person record", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await isDirectManager("clerk-unknown", "person-1");
    expect(result).toBe(false);
  });

  test("returns true when clerk user is the direct manager", async () => {
    // resolveClerkPerson → manager-id
    mockFindUnique.mockResolvedValueOnce({ id: "manager-id" });
    // person lookup → managerId matches
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-id" });

    const result = await isDirectManager("clerk-abc", "person-1");
    expect(result).toBe(true);
  });

  test("returns false when clerk user is NOT the direct manager", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "someone-else" });
    mockFindUnique.mockResolvedValueOnce({ managerId: "actual-manager" });

    const result = await isDirectManager("clerk-abc", "person-1");
    expect(result).toBe(false);
  });

  test("returns false when person has no manager", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockFindUnique.mockResolvedValueOnce({ managerId: null });

    const result = await isDirectManager("clerk-abc", "person-1");
    expect(result).toBe(false);
  });

  test("returns false when person does not exist", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await isDirectManager("clerk-abc", "person-nonexistent");
    expect(result).toBe(false);
  });
});
