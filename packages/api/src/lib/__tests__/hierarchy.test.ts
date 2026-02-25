import { beforeEach, describe, expect, mock, test } from "bun:test";

const mockFindUnique = mock(() =>
  Promise.resolve(null as { id?: string; managerId?: string | null } | null),
);

const mockGrantFindUnique = mock(() => Promise.resolve(null as { id: string } | null));

mock.module("@workspace/db", () => ({
  db: {
    person: {
      findUnique: mockFindUnique,
    },
    meetingVisibilityGrant: {
      findUnique: mockGrantFindUnique,
    },
  },
}));

const { isInManagementChain, canViewMeetings } = await import("../hierarchy");

describe("isInManagementChain", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockGrantFindUnique.mockReset();
  });

  test("returns false when clerk user has no person record", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await isInManagementChain("clerk-unknown", "person-1");
    expect(result).toBe(false);
  });

  test("returns true when viewer is in the management chain", async () => {
    // resolveClerkPerson → viewer-id
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // getManagementChain: person-1 → manager-a → viewer-id → null
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-a" });
    mockFindUnique.mockResolvedValueOnce({ managerId: "viewer-id" });
    mockFindUnique.mockResolvedValueOnce({ managerId: null });

    const result = await isInManagementChain("clerk-abc", "person-1");
    expect(result).toBe(true);
  });

  test("returns false when viewer is NOT in the management chain", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // person-1 → manager-a → null
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-a" });
    mockFindUnique.mockResolvedValueOnce({ managerId: null });

    const result = await isInManagementChain("clerk-abc", "person-1");
    expect(result).toBe(false);
  });

  test("returns false when person has no manager", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockFindUnique.mockResolvedValueOnce({ managerId: null });

    const result = await isInManagementChain("clerk-abc", "person-1");
    expect(result).toBe(false);
  });

  test("handles circular management chains gracefully", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // person-1 → manager-a → manager-b → manager-a (cycle detected, breaks)
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-a" });
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-b" });
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-a" });

    const result = await isInManagementChain("clerk-abc", "person-1");
    expect(result).toBe(false);
  });
});

describe("canViewMeetings", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockGrantFindUnique.mockReset();
  });

  test("returns true when viewer is in management chain", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // person-1 → viewer-id → null
    mockFindUnique.mockResolvedValueOnce({ managerId: "viewer-id" });
    mockFindUnique.mockResolvedValueOnce({ managerId: null });

    const result = await canViewMeetings("clerk-abc", "person-1");
    expect(result).toBe(true);
    expect(mockGrantFindUnique).not.toHaveBeenCalled();
  });

  test("returns true via visibility grant when NOT in chain", async () => {
    // isInManagementChain:
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-a" });
    mockFindUnique.mockResolvedValueOnce({ managerId: null });
    // canViewMeetings: resolveClerkPerson again
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // person manager lookup
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-a" });
    // grant exists
    mockGrantFindUnique.mockResolvedValueOnce({ id: "grant-1" });

    const result = await canViewMeetings("clerk-abc", "person-1");
    expect(result).toBe(true);
  });

  test("returns false when not in chain AND no grant exists", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-a" });
    mockFindUnique.mockResolvedValueOnce({ managerId: null });
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockFindUnique.mockResolvedValueOnce({ managerId: "manager-a" });
    mockGrantFindUnique.mockResolvedValueOnce(null);

    const result = await canViewMeetings("clerk-abc", "person-1");
    expect(result).toBe(false);
  });

  test("returns false when person has no manager", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockFindUnique.mockResolvedValueOnce({ managerId: null });
    // canViewMeetings: resolveClerkPerson again
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    // person lookup: no manager
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
