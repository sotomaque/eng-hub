import { beforeEach, describe, expect, mock, test } from "bun:test";

const mockGet = mock(() => Promise.resolve(null as string | null));
const mockSet = mock(() => Promise.resolve("OK"));
const mockExists = mock(() => Promise.resolve(0));
const mockSmembers = mock(() => Promise.resolve([] as string[]));
const mockSadd = mock(() => Promise.resolve(1));
const mockExpire = mock(() => Promise.resolve(1));
const mockSismember = mock(() => Promise.resolve(0));

mock.module("../redis", () => ({
  redis: {
    get: mockGet,
    set: mockSet,
    del: mock(),
    exists: mockExists,
    smembers: mockSmembers,
    sadd: mockSadd,
    expire: mockExpire,
    sismember: mockSismember,
  },
}));

const mockFindUnique = mock(() =>
  Promise.resolve(null as { id?: string; managerId?: string | null } | null),
);

const mockGrantFindUnique = mock(() =>
  Promise.resolve(null as { id: string } | null),
);

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
    mockGet.mockReset();
    mockSet.mockReset();
    mockExists.mockReset();
    mockSmembers.mockReset();
    mockSadd.mockReset();
    mockExpire.mockReset();
    mockSismember.mockReset();
    mockFindUnique.mockReset();
    mockGrantFindUnique.mockReset();
  });

  test("returns false when clerk user has no person record", async () => {
    mockGet.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(null);

    const result = await isInManagementChain("clerk-unknown", "person-1");
    expect(result).toBe(false);
  });

  test("uses cached clerk person mapping and Redis chain", async () => {
    mockGet.mockResolvedValueOnce("viewer-id");
    mockExists.mockResolvedValue(1);
    mockSismember.mockResolvedValue(1);

    const result = await isInManagementChain("clerk-abc", "person-1");

    expect(result).toBe(true);
    expect(mockSismember).toHaveBeenCalledWith(
      "enghub:mgmt-chain:person-1",
      "viewer-id",
    );
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  test("caches clerk-person mapping on DB lookup", async () => {
    mockGet.mockResolvedValueOnce(null);
    mockFindUnique.mockResolvedValueOnce({ id: "viewer-id" });
    mockExists.mockResolvedValue(1);
    mockSismember.mockResolvedValue(1);

    const result = await isInManagementChain("clerk-abc", "person-1");

    expect(result).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      "enghub:clerk-person:clerk-abc",
      "viewer-id",
      { ex: 3600 },
    );
  });

  test("returns false when viewer is NOT in cached chain", async () => {
    mockGet.mockResolvedValueOnce("viewer-id");
    mockExists.mockResolvedValue(1);
    mockSismember.mockResolvedValue(0);

    const result = await isInManagementChain("clerk-abc", "person-1");
    expect(result).toBe(false);
  });

  test("builds chain from DB and caches when not in Redis", async () => {
    mockGet.mockResolvedValueOnce("manager-b");
    mockExists.mockResolvedValue(0);
    // person-1 -> manager-a -> manager-b -> null
    mockFindUnique
      .mockResolvedValueOnce({ managerId: "manager-a" })
      .mockResolvedValueOnce({ managerId: "manager-b" })
      .mockResolvedValueOnce({ managerId: null });

    const result = await isInManagementChain("clerk-abc", "person-1");

    expect(result).toBe(true);
    expect(mockSadd).toHaveBeenCalledWith(
      "enghub:mgmt-chain:person-1",
      "manager-a",
    );
    expect(mockSadd).toHaveBeenCalledWith(
      "enghub:mgmt-chain:person-1",
      "manager-b",
    );
    expect(mockExpire).toHaveBeenCalledWith("enghub:mgmt-chain:person-1", 1800);
  });

  test("returns empty chain when person has no manager", async () => {
    mockGet.mockResolvedValueOnce("viewer-id");
    mockExists.mockResolvedValue(0);
    mockFindUnique.mockResolvedValueOnce({ managerId: null });

    const result = await isInManagementChain("clerk-abc", "person-1");

    expect(result).toBe(false);
    expect(mockSadd).not.toHaveBeenCalled();
  });

  test("handles circular management chains gracefully", async () => {
    mockGet.mockResolvedValueOnce("viewer-id");
    mockExists.mockResolvedValue(0);
    // person-1 -> manager-a -> manager-b -> manager-a (cycle)
    mockFindUnique
      .mockResolvedValueOnce({ managerId: "manager-a" })
      .mockResolvedValueOnce({ managerId: "manager-b" })
      .mockResolvedValueOnce({ managerId: "manager-a" });

    const result = await isInManagementChain("clerk-abc", "person-1");

    expect(result).toBe(false);
    expect(mockSadd).toHaveBeenCalled();
  });
});

describe("canViewMeetings", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockExists.mockReset();
    mockSmembers.mockReset();
    mockSadd.mockReset();
    mockExpire.mockReset();
    mockSismember.mockReset();
    mockFindUnique.mockReset();
    mockGrantFindUnique.mockReset();
  });

  test("returns true when viewer is in management chain", async () => {
    // Viewer resolved from cache, chain exists, viewer is member
    mockGet.mockResolvedValueOnce("viewer-id");
    mockExists.mockResolvedValue(1);
    mockSismember.mockResolvedValue(1);

    const result = await canViewMeetings("clerk-abc", "person-1");

    expect(result).toBe(true);
    expect(mockGrantFindUnique).not.toHaveBeenCalled();
  });

  test("returns true via visibility grant when NOT in chain", async () => {
    // isInManagementChain returns false
    mockGet.mockResolvedValueOnce("viewer-id");
    mockExists.mockResolvedValue(1);
    mockSismember.mockResolvedValue(0);
    // resolveClerkPerson called again — return cached value
    mockGet.mockResolvedValueOnce("viewer-id");
    // person lookup returns managerId
    mockFindUnique.mockResolvedValueOnce({ managerId: "mgr-1" });
    // grant exists
    mockGrantFindUnique.mockResolvedValueOnce({ id: "grant-1" });

    const result = await canViewMeetings("clerk-abc", "person-1");

    expect(result).toBe(true);
    expect(mockGrantFindUnique).toHaveBeenCalled();
  });

  test("returns false when not in chain AND no grant exists", async () => {
    mockGet.mockResolvedValueOnce("viewer-id");
    mockExists.mockResolvedValue(1);
    mockSismember.mockResolvedValue(0);
    mockGet.mockResolvedValueOnce("viewer-id");
    mockFindUnique.mockResolvedValueOnce({ managerId: "mgr-1" });
    mockGrantFindUnique.mockResolvedValueOnce(null);

    const result = await canViewMeetings("clerk-abc", "person-1");

    expect(result).toBe(false);
  });

  test("returns false when person has no manager", async () => {
    mockGet.mockResolvedValueOnce("viewer-id");
    mockExists.mockResolvedValue(1);
    mockSismember.mockResolvedValue(0);
    mockGet.mockResolvedValueOnce("viewer-id");
    mockFindUnique.mockResolvedValueOnce({ managerId: null });

    const result = await canViewMeetings("clerk-abc", "person-1");

    expect(result).toBe(false);
    expect(mockGrantFindUnique).not.toHaveBeenCalled();
  });

  test("returns false when viewer has no person record", async () => {
    // isInManagementChain returns false (no viewer)
    mockGet.mockResolvedValueOnce(null);
    mockFindUnique.mockResolvedValueOnce(null); // DB lookup for clerk person
    mockExists.mockResolvedValue(0);
    // resolveClerkPerson returns null again
    mockGet.mockResolvedValueOnce(null);

    const result = await canViewMeetings("clerk-unknown", "person-1");

    expect(result).toBe(false);
    expect(mockGrantFindUnique).not.toHaveBeenCalled();
  });

  test("returns false when grant exists for different grantee", async () => {
    mockGet.mockResolvedValueOnce("viewer-id");
    mockExists.mockResolvedValue(1);
    mockSismember.mockResolvedValue(0);
    mockGet.mockResolvedValueOnce("viewer-id");
    mockFindUnique.mockResolvedValueOnce({ managerId: "mgr-1" });
    // Grant lookup with granterId=mgr-1, granteeId=viewer-id returns null
    // (grant is for a different grantee)
    mockGrantFindUnique.mockResolvedValueOnce(null);

    const result = await canViewMeetings("clerk-abc", "person-1");

    expect(result).toBe(false);
  });
});
